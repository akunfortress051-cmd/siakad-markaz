import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// POST /api/admin/program/[id]/mapel — tambah mapel baru ke program
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: programId } = await params;
    const body = await request.json();
    const { nama_indo, nama_arab } = body;

    if (!nama_indo?.trim() || !nama_arab?.trim()) {
      return NextResponse.json({ error: "Nama mapel (Indo & Arab) wajib diisi." }, { status: 400 });
    }

    // Cari urutan terbesar yang sudah ada untuk program ini
    const lastMapel = await prisma.programMapel.findFirst({
      where: { programId },
      orderBy: { urutan: "desc" },
    });
    const nextUrutan = (lastMapel?.urutan ?? 0) + 1;

    // Cek apakah mapel dengan nama ini sudah ada secara global
    let mapel = await prisma.mapel.findUnique({ where: { nama_indo: nama_indo.trim() } });

    // Jika belum ada, buat mapel baru
    if (!mapel) {
      mapel = await prisma.mapel.create({
        data: { nama_indo: nama_indo.trim(), nama_arab: nama_arab.trim() },
      });
    }

    // Cek apakah sudah terdaftar di program ini
    const existing = await prisma.programMapel.findUnique({
      where: { programId_mapelId: { programId, mapelId: mapel.id } },
    });
    if (existing) {
      return NextResponse.json({ error: "Mapel ini sudah terdaftar di program tersebut." }, { status: 400 });
    }

    await prisma.programMapel.create({
      data: { programId, mapelId: mapel.id, urutan: nextUrutan },
    });

    return NextResponse.json({ success: true, mapel });
  } catch (error) {
    console.error("Error adding mapel:", error);
    return NextResponse.json({ error: "Gagal menambah mapel." }, { status: 500 });
  }
}

// PUT /api/admin/program/[id]/mapel — simpan ulang urutan semua mapel (drag-and-drop)
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: programId } = await params;
    const body = await request.json();
    const { order }: { order: Array<{ mapelId: string; urutan: number }> } = body;

    if (!Array.isArray(order) || order.length === 0) {
      return NextResponse.json({ error: "Data urutan tidak valid." }, { status: 400 });
    }

    await prisma.$transaction(
      order.map(({ mapelId, urutan }) =>
        prisma.programMapel.update({
          where: { programId_mapelId: { programId, mapelId } },
          data: { urutan },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering mapel:", error);
    return NextResponse.json({ error: "Gagal mengubah urutan mapel." }, { status: 500 });
  }
}
