import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getActiveRiwayatListForAbsen } from "@/lib/absensi";

export async function GET(request: Request, props: { params: Promise<{ grupId: string }> }) {
  const params = await props.params;

  try {
    const records = await prisma.perizinan.findMany({
      where: { grupTasrihId: params.grupId },
      include: {
        riwayat: {
          include: {
            santri: true,
            kelas: true
          }
        }
      }
    });

    if (!records || records.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Fetch setting global batas jam
    let batasJamAkhir = null;
    if (records[0].tipeIzin === "KELUAR_PARE") {
      const setting = await prisma.pengaturanPerizinan.findUnique({ where: { id: 1 } });
      batasJamAkhir = setting?.batasJamAkhirKeluarPare || "22:00";
    }

    // Enrich records with sakan from master santri API
    let sakanMap: Record<string, string> = {};
    try {
      const masterList = await getActiveRiwayatListForAbsen();
      masterList.forEach(s => { sakanMap[s.riwayatId] = s.sakan; });
    } catch (e) {
      // Non-fatal: sakan will just be empty if API fails
    }

    const enrichedRecords = records.map(r => ({
      ...r,
      sakan: sakanMap[r.riwayatId] || "-"
    }));

    return NextResponse.json({
      records: enrichedRecords,
      batasJamAkhir,
      tipeIzin: records[0].tipeIzin,
      statusIzin: records[0].statusIzin,
      alasan: records[0].alasan,
      tanggalMulai: records[0].tanggalMulai,
      tanggalSelesai: records[0].tanggalSelesai,
      nomorTasrih: records[0].nomorTasrih,
      createdAt: records[0].createdAt,
      createdBy: records[0].createdBy
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch tasrih detail" }, { status: 500 });
  }
}
