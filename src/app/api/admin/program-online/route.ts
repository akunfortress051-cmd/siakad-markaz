import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET — List semua program online
export async function GET() {
  const programs = await prisma.programOnline.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { syahadahList: true } } },
  });
  return NextResponse.json(programs);
}

// POST — Tambah program online baru
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { namaIndo, namaArab, tglCetakArab, periodeAwal, periodeAkhir } = body;

    if (!namaIndo || !namaArab) {
      return NextResponse.json({ error: "Nama Indo dan Nama Arab wajib diisi" }, { status: 400 });
    }

    const program = await prisma.programOnline.create({
      data: { namaIndo, namaArab, tglCetakArab, periodeAwal, periodeAkhir },
    });

    return NextResponse.json(program);
  } catch (e: any) {
    if (e.code === "P2002") {
      return NextResponse.json({ error: "Program dengan nama ini sudah ada" }, { status: 409 });
    }
    return NextResponse.json({ error: "Gagal menambahkan program" }, { status: 500 });
  }
}

// PUT — Update program online
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, namaIndo, namaArab, tglCetakArab, periodeAwal, periodeAkhir } = body;

    if (!id) {
      return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });
    }

    const program = await prisma.programOnline.update({
      where: { id },
      data: { namaIndo, namaArab, tglCetakArab, periodeAwal, periodeAkhir },
    });

    return NextResponse.json(program);
  } catch (e: any) {
    if (e.code === "P2002") {
      return NextResponse.json({ error: "Program dengan nama ini sudah ada" }, { status: 409 });
    }
    return NextResponse.json({ error: "Gagal mengupdate program" }, { status: 500 });
  }
}

// DELETE — Hapus program online
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });
    }

    await prisma.programOnline.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus program" }, { status: 500 });
  }
}
