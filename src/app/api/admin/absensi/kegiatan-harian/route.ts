import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseWibDateString, getActiveRiwayatListForAbsen } from "@/lib/absensi";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tanggal = searchParams.get("tanggal");
  const kategoriId = searchParams.get("kategoriId");
  const kelasId = searchParams.get("kelasId") || "ALL";

  if (!tanggal || !kategoriId) {
    return NextResponse.json({ error: "Tanggal dan Kategori harus diisi" }, { status: 400 });
  }

  const parsedDate = parseWibDateString(tanggal);
  const santriList = await getActiveRiwayatListForAbsen(kelasId);
  const santriIds = santriList.map((s) => s.riwayatId);

  const existingAbsen = await prisma.absenKegiatan.findMany({
    where: {
      tanggal: parsedDate,
      kategoriId: kategoriId,
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
    const { tanggal, kategoriId, absenList } = payload as { 
      tanggal: string, 
      kategoriId: string,
      absenList: { riwayatId: string, status: any, keterangan?: string }[] 
    };

    if (!tanggal || !kategoriId || !absenList || !Array.isArray(absenList)) {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }

    const parsedDate = parseWibDateString(tanggal);

    const operations = absenList.map((absen) =>
      prisma.absenKegiatan.upsert({
        where: {
          riwayatId_kategoriId_tanggal: {
            riwayatId: absen.riwayatId,
            tanggal: parsedDate,
            kategoriId: kategoriId,
          },
        },
        update: {
          status: absen.status,
          keterangan: absen.keterangan || null,
        },
        create: {
          riwayatId: absen.riwayatId,
          tanggal: parsedDate,
          kategoriId: kategoriId,
          status: absen.status,
          keterangan: absen.keterangan || null,
        },
      })
    );

    await prisma.$transaction(operations);

    return NextResponse.json({ success: true, count: operations.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal menyimpan absensi kegiatan" }, { status: 500 });
  }
}
