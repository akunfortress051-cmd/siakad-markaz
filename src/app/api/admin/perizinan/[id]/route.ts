import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { processAutoAbsensiIzin, rollbackAutoAbsensiIzin } from "@/lib/perizinan-utils";

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = await prisma.perizinan.findUnique({
      where: { id: params.id },
      include: {
        riwayat: {
          include: {
            santri: true,
            kelas: true
          }
        }
      }
    });

    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Fetch batas jam for KELUAR_PARE
    let batasJam = null;
    if (data.tipeIzin === "KELUAR_PARE") {
      const setting = await prisma.pengaturanPerizinan.findUnique({ where: { id: 1 } });
      batasJam = setting?.batasJamKeluarPare || 12;
    }

    // Fetch petugas name if available
    let petugasNama = null;
    if (data.createdBy) {
      const user = await prisma.user.findUnique({ where: { id: data.createdBy }, select: { nama: true } });
      if (user) petugasNama = user.nama;
    }

    return NextResponse.json({ ...data, batasJam, petugasNama });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch perizinan detail" }, { status: 500 });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const izin = await prisma.perizinan.findUnique({ where: { id: params.id } });
    if (!izin) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Hapus izin
    await prisma.perizinan.delete({ where: { id: params.id } });

    // Rollback absensi
    await rollbackAutoAbsensiIzin(izin.nomorTasrih);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete perizinan" }, { status: 500 });
  }
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { statusIzin } = await request.json();
    
    if (!statusIzin) return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });

    const izin = await prisma.perizinan.findUnique({ where: { id: params.id } });
    if (!izin) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Update status
    const updated = await prisma.perizinan.update({
      where: { id: params.id },
      data: { statusIzin }
    });

    // Jika approve (dari MENUNGGU ke AKTIF)
    if (izin.statusIzin === "MENUNGGU" && statusIzin === "AKTIF") {
      await processAutoAbsensiIzin(
        izin.riwayatId,
        izin.tipeIzin,
        izin.tanggalMulai,
        izin.tanggalSelesai,
        izin.alasan,
        izin.nomorTasrih
      );
      
      // Update createdBy to the user who approved it
      await prisma.perizinan.update({
        where: { id: params.id },
        data: { createdBy: session.userId }
      });
    }

    return NextResponse.json({ success: true, updated });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update perizinan" }, { status: 500 });
  }
}
