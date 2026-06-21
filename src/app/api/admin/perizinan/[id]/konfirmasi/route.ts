import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const izin = await prisma.perizinan.findUnique({ where: { id: params.id } });
    if (!izin) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (izin.statusIzin !== "AKTIF" && izin.statusIzin !== "SELESAI") {
      return NextResponse.json({ error: "Hanya izin AKTIF atau SELESAI yang dapat dikonfirmasi" }, { status: 400 });
    }

    // Update status ke SUDAH_KEMBALI
    await prisma.perizinan.update({
      where: { id: params.id },
      data: { 
        statusIzin: "SUDAH_KEMBALI",
        tanggalKembali: new Date()
      }
    });

    // Opsional: jika hari ini masih dalam rentang izin, hapus absensi IZIN untuk hari esok
    // Tapi karena logic absensi auto-generated ke hari berikutnya, kita bisa hapus absensi IZIN
    // untuk hari-hari setelah tanggalKembali (jika tipe BERHARI_HARI)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (izin.tipeIzin === "BERHARI_HARI" && izin.tanggalSelesai && izin.tanggalSelesai > today) {
      // Cari dan hapus absensi IZIN untuk tanggal > today
      const searchKeterangan = { contains: `[${izin.nomorTasrih}]` };
      await prisma.$transaction([
        prisma.absenKelas.deleteMany({ where: { keterangan: searchKeterangan, tanggal: { gt: today } } }),
        prisma.absenSakan.deleteMany({ where: { keterangan: searchKeterangan, tanggal: { gt: today } } }),
        prisma.absenKegiatan.deleteMany({ where: { keterangan: searchKeterangan, tanggal: { gt: today } } }),
      ]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to confirm perizinan" }, { status: 500 });
  }
}
