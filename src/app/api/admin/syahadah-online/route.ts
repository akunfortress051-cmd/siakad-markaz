import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET — List semua syahadah online
export async function GET() {
  const records = await prisma.syahadahOnline.findMany({
    orderBy: { createdAt: "desc" },
    include: { programOnline: true },
  });
  return NextResponse.json(records);
}

// POST — Tambah syahadah online baru
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nama, programOnlineId, isMusyarokah, nilai } = body;

    if (!nama) {
      return NextResponse.json({ error: "Nama wajib diisi" }, { status: 400 });
    }

    const record = await prisma.syahadahOnline.create({
      data: {
        nama,
        programOnlineId: isMusyarokah ? null : programOnlineId,
        isMusyarokah: !!isMusyarokah,
        nilai: isMusyarokah ? null : (nilai ? parseFloat(nilai) : null),
      },
      include: { programOnline: true },
    });

    return NextResponse.json(record);
  } catch {
    return NextResponse.json({ error: "Gagal menambahkan data" }, { status: 500 });
  }
}

// PUT — Update syahadah online
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, nama, programOnlineId, isMusyarokah, nilai } = body;

    if (!id) {
      return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });
    }

    const record = await prisma.syahadahOnline.update({
      where: { id },
      data: {
        nama,
        programOnlineId: isMusyarokah ? null : programOnlineId,
        isMusyarokah: !!isMusyarokah,
        nilai: isMusyarokah ? null : (nilai !== undefined && nilai !== null && nilai !== "" ? parseFloat(nilai) : null),
      },
      include: { programOnline: true },
    });

    return NextResponse.json(record);
  } catch {
    return NextResponse.json({ error: "Gagal mengupdate data" }, { status: 500 });
  }
}

// DELETE — Hapus syahadah online
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });
    }

    await prisma.syahadahOnline.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus data" }, { status: 500 });
  }
}
