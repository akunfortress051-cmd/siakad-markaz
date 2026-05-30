import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getActiveRiwayatListForAbsen } from "@/lib/absensi";
import { getMasterSantriList } from "@/lib/santri-api";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const kelasId = searchParams.get("kelasId");
    const month = searchParams.get("month");

    if (!kelasId) {
      return NextResponse.json({ error: "Missing kelasId" }, { status: 400 });
    }

    const kelasInfo = await prisma.kelas.findUnique({
      where: { id: kelasId }
    });
    const isBulan2 = kelasInfo?.is_akbarnas_b2 || false;

    let targetRiwayatList: any[] = [];

    if (month === "1" || month === "2") {
      const activeRiwayatList = await getActiveRiwayatListForAbsen(kelasId);
      
      if (month === "2" && !isBulan2) {
        // Masih di Bulan 1, belum ada Bulan 2
        targetRiwayatList = [];
      } else if (month === "2" && isBulan2) {
        // Sedang di Bulan 2, minta Bulan 2 (Active)
        targetRiwayatList = activeRiwayatList;
      } else if (month === "1" && !isBulan2) {
        // Sedang di Bulan 1, minta Bulan 1 (Active)
        targetRiwayatList = activeRiwayatList;
      } else if (month === "1" && isBulan2) {
        // Sedang di Bulan 2, minta Bulan 1 (Historical)
        const santriIds = activeRiwayatList.map((r) => r.santriId);
        
        const previousRiwayats = await prisma.riwayatSantri.findMany({
          where: {
            santriId: { in: santriIds },
            program: { nama_indo: { contains: "akbarnas", mode: "insensitive" } },
            id: { notIn: activeRiwayatList.map((r) => r.riwayatId) }
          },
          orderBy: { id: 'desc' }
        });

        const santriToHistorical = new Map();
        for (const r of previousRiwayats) {
          if (!santriToHistorical.has(r.santriId)) {
            santriToHistorical.set(r.santriId, r);
          }
        }

        targetRiwayatList = activeRiwayatList.map(active => {
          const hist = santriToHistorical.get(active.santriId);
          if (hist) {
            return { ...active, riwayatId: hist.id };
          }
          return null;
        }).filter(Boolean);
      }
    } else {
      targetRiwayatList = await getActiveRiwayatListForAbsen(kelasId);
    }

    const riwayatIds = targetRiwayatList.map((r) => r.riwayatId);

    // Ambil data nilai dan status tasmi' untuk riwayat tersebut
    const dbRiwayat = await prisma.riwayatSantri.findMany({
      where: { id: { in: riwayatIds } },
      select: {
        id: true,
        is_tasmi: true,
        nilaiList: true // Ambil semua nilai
      }
    });

    const riwayatMap = new Map(dbRiwayat.map(r => [r.id, r]));

    const responseData = targetRiwayatList.map(santri => {
      const dbData = riwayatMap.get(santri.riwayatId);
      const nilaiMap: any = {};
      
      if (dbData?.nilaiList) {
        for (const nilai of dbData.nilaiList) {
          nilaiMap[nilai.mapelId] = {
            u1: nilai.nilaiUsbu1 ?? null,
            u2: nilai.nilaiUsbu2 ?? null,
            n: nilai.nilaiNihai ?? null,
            a: nilai.nilaiAkhir ?? null,
          };
        }
      }

      return {
        riwayatId: santri.riwayatId,
        santriId: santri.santriId,
        nama: santri.nama,
        is_tasmi: dbData?.is_tasmi ?? false,
        nilai: nilaiMap,
      };
    });

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error fetching class grades:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { updates } = body;

    if (!Array.isArray(updates)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      for (const update of updates) {
        // Update is_tasmi di tabel RiwayatSantri
        if (update.is_tasmi !== undefined) {
          await tx.riwayatSantri.update({
            where: { id: update.riwayatId },
            data: { is_tasmi: update.is_tasmi }
          });
        }

        // Upsert nilai untuk setiap mapel
        if (update.nilai && typeof update.nilai === 'object') {
          for (const [mapelId, grades] of Object.entries<any>(update.nilai)) {
            if (grades.u1 !== undefined || grades.u2 !== undefined || grades.n !== undefined || grades.a !== undefined) {
              const dataToUpdate: any = {};
              if (grades.u1 !== undefined) dataToUpdate.nilaiUsbu1 = grades.u1;
              if (grades.u2 !== undefined) dataToUpdate.nilaiUsbu2 = grades.u2;
              if (grades.n !== undefined) dataToUpdate.nilaiNihai = grades.n;
              if (grades.a !== undefined) dataToUpdate.nilaiAkhir = grades.a;

              await tx.nilai.upsert({
                where: {
                  riwayatId_mapelId: {
                    riwayatId: update.riwayatId,
                    mapelId: mapelId,
                  }
                },
                update: dataToUpdate,
                create: {
                  riwayatId: update.riwayatId,
                  mapelId: mapelId,
                  ...dataToUpdate
                }
              });
            }
          }
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving bulk grades:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
