import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { processAutoAbsensiIzin, rollbackAutoAbsensiIzin } from "@/lib/perizinan-utils";
import { getActiveRiwayatListForAbsen } from "@/lib/absensi";

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
    let batasJamAkhir = null;
    if (data.tipeIzin === "KELUAR_PARE") {
      const setting = await prisma.pengaturanPerizinan.findUnique({ where: { id: 1 } });
      batasJam = setting?.batasJamKeluarPare || 12;
      batasJamAkhir = setting?.batasJamAkhirKeluarPare || "19:00";
    }

    // Fetch petugas name if available
    let petugasNama = null;
    if (data.createdBy) {
      const user = await prisma.user.findUnique({ where: { id: data.createdBy }, select: { nama: true } });
      if (user) petugasNama = user.nama;
    }

    // Fetch sakan from master santri API
    let sakan = "-";
    try {
      const masterList = await getActiveRiwayatListForAbsen();
      const match = masterList.find(s => s.riwayatId === data.riwayatId);
      if (match) sakan = match.sakan;
    } catch (e) {
      // Non-fatal
    }

    return NextResponse.json({ ...data, batasJam, batasJamAkhir, petugasNama, sakan });
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

    const targetRecords = izin.grupTasrihId
      ? await prisma.perizinan.findMany({ where: { grupTasrihId: izin.grupTasrihId } })
      : [izin];

    for (const record of targetRecords) {
      await prisma.perizinan.update({
        where: { id: record.id },
        data: { statusIzin }
      });

      // Jika approve (dari MENUNGGU ke AKTIF)
      if (record.statusIzin === "MENUNGGU" && statusIzin === "AKTIF") {
        await processAutoAbsensiIzin(
          record.riwayatId,
          record.tipeIzin,
          record.tanggalMulai,
          record.tanggalSelesai,
          record.alasan,
          record.nomorTasrih
        );
        
        // Update createdBy to the user who approved it
        await prisma.perizinan.update({
          where: { id: record.id },
          data: { createdBy: session.userId }
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update perizinan" }, { status: 500 });
  }
}
