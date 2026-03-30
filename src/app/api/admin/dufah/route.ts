import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getMasterSantriList } from "@/lib/santri-api";

export async function GET() {
  try {
    // 1. Sync dufah dari master API 
    const masterList = await getMasterSantriList();
    const dufahSet = new Set<string>();
    masterList.forEach(m => {
      if (m.dufahNama && m.dufahNama !== "-") {
        dufahSet.add(m.dufahNama);
      }
    });

    if (dufahSet.size > 0) {
      const existingDufahs = await prisma.dufah.findMany({
        where: { nama: { in: Array.from(dufahSet) } },
        select: { nama: true }
      });
      const existingNames = new Set(existingDufahs.map(d => d.nama));
      
      const missingDufahs = Array.from(dufahSet).filter(name => !existingNames.has(name));
      if (missingDufahs.length > 0) {
        await prisma.dufah.createMany({
          data: missingDufahs.map(nama => ({ nama })),
          skipDuplicates: true
        });
      }
    }

    const dufahList = await prisma.dufah.findMany({
      orderBy: { nama: "desc" },
    });
    return NextResponse.json(dufahList);
  } catch (error) {
    console.error("Error fetching dufah:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data angkatan" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nama } = body;

    if (!nama) {
      return NextResponse.json(
        { error: "Nama angkatan wajib diisi" },
        { status: 400 }
      );
    }

    const newDufah = await prisma.dufah.create({
      data: {
        nama,
      },
    });

    return NextResponse.json(newDufah, { status: 201 });
  } catch (error: any) {
    console.error("Error creating dufah:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Nama angkatan sudah ada" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Gagal membuat angkatan baru" },
      { status: 500 }
    );
  }
}
