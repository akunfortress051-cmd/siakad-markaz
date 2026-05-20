import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dari = searchParams.get("dari");
  const sampai = searchParams.get("sampai");

  if (!dari || !sampai) {
    return NextResponse.json({ error: "Parameter rentang tanggal tidak lengkap" }, { status: 400 });
  }

  try {
    const records = await prisma.absenPengajar.findMany({
      where: {
        tanggal: {
          gte: new Date(`${dari}T00:00:00Z`),
          lte: new Date(`${sampai}T23:59:59Z`),
        }
      },
      include: {
        user: { select: { nama: true } },
        kelas: { select: { nama: true } },
      },
      orderBy: [
        { user: { nama: 'asc' } },
        { tanggal: 'asc' },
        { sesi: 'asc' }
      ]
    });

    const formatted = records.map(r => ({
      id: r.id,
      pengajar: r.user.nama,
      kelas: r.kelas.nama,
      tanggal: r.tanggal.toISOString().split("T")[0],
      sesi: r.sesi,
      materi: r.materi || "-",
      waktuMulai: r.waktuMulai,
      waktuSelesai: r.waktuSelesai,
      atribut: {
        nametag: r.atributNametag,
        kopiah: r.atributKopiah,
        bros: r.atributBros,
      }
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Error fetching rekap pengajar:", error);
    return NextResponse.json({ error: "Terjadi kesalahan sistem" }, { status: 500 });
  }
}
