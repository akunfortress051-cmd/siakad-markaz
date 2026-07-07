import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const sesiList = await prisma.sesiAbsenKegiatan.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      kategori: true,
      lokasiList: { include: { lokasi: true } },
    }
  });
  return NextResponse.json(sesiList);
}

export async function POST(request: Request) {
  try {
    const { kategoriId, durasiMenit, lokasiIds } = await request.json();
    
    if (!kategoriId || !durasiMenit || !lokasiIds || !Array.isArray(lokasiIds) || lokasiIds.length === 0) {
      return NextResponse.json({ error: "Data sesi belum lengkap" }, { status: 400 });
    }

    // Generate random 6 characters uppercase code
    const kode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const ditutupPada = new Date(Date.now() + durasiMenit * 60000);

    const sesi = await prisma.sesiAbsenKegiatan.create({
      data: {
        kode,
        kategoriId,
        durasiMenit,
        ditutupPada,
        lokasiList: {
          create: lokasiIds.map(id => ({ lokasiId: id }))
        }
      },
      include: {
        kategori: true,
        lokasiList: { include: { lokasi: true } }
      }
    });

    return NextResponse.json({ success: true, sesi });
  } catch (error) {
    console.error("POST sesi error", error);
    return NextResponse.json({ error: "Gagal membuka sesi absen" }, { status: 500 });
  }
}
