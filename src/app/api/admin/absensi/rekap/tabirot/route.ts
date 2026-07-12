import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dari = searchParams.get("dari");
    const sampai = searchParams.get("sampai");
    const kelompokId = searchParams.get("kelompokId");

    const dateFilter: any = {};
    if (dari) dateFilter.gte = new Date(`${dari}T00:00:00Z`);
    if (sampai) dateFilter.lte = new Date(`${sampai}T23:59:59Z`);
    const tanggalWhere = Object.keys(dateFilter).length > 0 ? { tanggal: dateFilter } : {};

    const whereClause: any = {
      ...tanggalWhere,
    };
    if (kelompokId) {
      whereClause.kelompokId = kelompokId;
    }

    const records = await prisma.absenTabirot.findMany({
      where: whereClause,
      include: {
        santri: {
          select: {
            id: true,
            nama: true,
          }
        },
        kelompok: {
          select: {
            id: true,
            tempat: true,
            bulanKe: true,
          }
        }
      }
    });

    const recapMap = new Map<string, any>();
    for (const record of records) {
      const key = `${record.santriId}_${record.kelompokId}`;
      if (!recapMap.has(key)) {
        recapMap.set(key, {
          santriId: record.santriId,
          santriNama: record.santri?.nama || "Tanpa Nama",
          kelompokId: record.kelompokId,
          tempat: record.kelompok.tempat,
          bulanKe: record.kelompok.bulanKe,
          HADIR: 0,
          IZIN: 0,
          SAKIT: 0,
          ALPHA: 0,
        });
      }
      
      const req = recapMap.get(key);
      if (record.status) {
        req[record.status] = (req[record.status] || 0) + 1;
      }
    }

    const results = Array.from(recapMap.values());
    results.sort((a,b) => a.santriNama.localeCompare(b.santriNama));

    return NextResponse.json(results);
  } catch (error) {
    console.error("Failed to fetch rekap tabirot", error);
    return NextResponse.json({ error: "Gagal memuat data rekap" }, { status: 500 });
  }
}
