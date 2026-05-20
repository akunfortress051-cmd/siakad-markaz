import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getActiveRiwayatListForAbsen } from "@/lib/absensi";
import { parseWibDateString } from "@/lib/jadwal-sesi";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tanggal = searchParams.get("tanggal");
  const sakan = searchParams.get("sakan") || "ALL";

  if (!tanggal) {
    return NextResponse.json({ error: "Tanggal harus diisi" }, { status: 400 });
  }

  const parsedDate = parseWibDateString(tanggal);
  const santriList = await getActiveRiwayatListForAbsen(undefined, sakan);
  const santriIds = santriList.map((s) => s.riwayatId);

  const existingAbsen = await prisma.absenSakan.findMany({
    where: {
      tanggal: parsedDate,
      riwayatId: { in: santriIds },
    },
  });

  return NextResponse.json({
    santriList,
    absenData: existingAbsen,
  });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { tanggal, absenList } = payload as { 
      tanggal: string, 
      absenList: { riwayatId: string, status: any, keterangan?: string }[] 
    };

    if (!tanggal || !absenList || !Array.isArray(absenList)) {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }

    const parsedDate = parseWibDateString(tanggal);

    // Upsert each using transaction
    const operations = absenList.map((absen) =>
      prisma.absenSakan.upsert({
        where: {
          riwayatId_tanggal: {
            riwayatId: absen.riwayatId,
            tanggal: parsedDate,
          },
        },
        update: {
          status: absen.status,
          keterangan: absen.keterangan || null,
        },
        create: {
          riwayatId: absen.riwayatId,
          tanggal: parsedDate,
          status: absen.status,
          keterangan: absen.keterangan || null,
        },
      })
    );

    await prisma.$transaction(operations);

    return NextResponse.json({ success: true, count: operations.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal menyimpan absensi" }, { status: 500 });
  }
}
