import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const lokasiList = await prisma.lokasiKegiatan.findMany({
    orderBy: { nama: "asc" }
  });
  return NextResponse.json(lokasiList);
}

export async function POST(request: Request) {
  try {
    const { nama, latitude, longitude, radius, aktif } = await request.json();
    
    if (!nama || latitude === undefined || longitude === undefined || radius === undefined) {
      return NextResponse.json({ error: "Data lokasi harus diisi lengkap" }, { status: 400 });
    }

    const lokasi = await prisma.lokasiKegiatan.create({
      data: {
        nama: nama.trim(),
        latitude,
        longitude,
        radius,
        aktif: aktif ?? true,
      }
    });

    return NextResponse.json({ success: true, lokasi });
  } catch (error) {
    return NextResponse.json({ error: "Gagal menambahkan lokasi kegiatan" }, { status: 500 });
  }
}
