import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const kegiatanList = await prisma.kategoriKegiatan.findMany({
    orderBy: { nama: "asc" }
  });
  return NextResponse.json(kegiatanList);
}

export async function POST(request: Request) {
  try {
    const { nama, aktif } = await request.json();
    
    if (!nama) {
      return NextResponse.json({ error: "Nama Kegiatan harus diisi" }, { status: 400 });
    }

    const kegiatan = await prisma.kategoriKegiatan.create({
      data: {
        nama: nama.trim(),
        aktif: aktif ?? true,
      }
    });

    return NextResponse.json({ success: true, kegiatan });
  } catch (error) {
    return NextResponse.json({ error: "Gagal menambahkan kategori kegiatan" }, { status: 500 });
  }
}
