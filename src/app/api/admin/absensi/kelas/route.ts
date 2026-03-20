import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseWibDateString, getActiveRiwayatListForAbsen } from "@/lib/absensi";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tanggal = searchParams.get("tanggal");
  const hissoh = searchParams.get("hissoh");
  const kelasId = searchParams.get("kelasId") || "ALL";

  if (!tanggal || !hissoh) {
    return NextResponse.json({ error: "Tanggal dan Hissoh harus diisi" }, { status: 400 });
  }

  const parsedDate = parseWibDateString(tanggal);
  const santriList = await getActiveRiwayatListForAbsen(kelasId);
  const santriIds = santriList.map((s) => s.riwayatId);

  const existingAbsen = await prisma.absenKelas.findMany({
    where: {
      tanggal: parsedDate,
      hissoh: hissoh as any,
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
    const { tanggal, hissoh, absenList } = payload as { 
      tanggal: string, 
      hissoh: any,
      absenList: { riwayatId: string, status: any, keterangan?: string }[] 
    };

    if (!tanggal || !hissoh || !absenList || !Array.isArray(absenList)) {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }

    const parsedDate = parseWibDateString(tanggal);

    const operations = absenList.map((absen) =>
      prisma.absenKelas.upsert({
        where: {
          riwayatId_tanggal_hissoh: {
            riwayatId: absen.riwayatId,
            tanggal: parsedDate,
            hissoh: hissoh,
          },
        },
        update: {
          status: absen.status,
          keterangan: absen.keterangan || null,
        },
        create: {
          riwayatId: absen.riwayatId,
          tanggal: parsedDate,
          hissoh: hissoh,
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
