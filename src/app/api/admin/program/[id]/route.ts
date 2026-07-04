import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { nama_indo, nama_arab, kkm, kategori } = body;

    if (!nama_indo?.trim() || !nama_arab?.trim() || kkm == null) {
      return NextResponse.json({ error: "Semua field wajib diisi." }, { status: 400 });
    }

    const duplicate = await prisma.program.findFirst({
      where: { nama_indo: nama_indo.trim(), id: { not: id } },
    });
    if (duplicate) {
      return NextResponse.json({ error: "Nama program sudah digunakan." }, { status: 400 });
    }

    const updated = await prisma.program.update({
      where: { id },
      data: {
        nama_indo: nama_indo.trim(),
        nama_arab: nama_arab.trim(),
        kkm: Number(kkm),
        kategori: kategori === "TURATS" ? "TURATS" : "REGULER",
      },
    });

    return NextResponse.json({ success: true, program: updated });
  } catch (error) {
    console.error("Error updating program:", error);
    return NextResponse.json({ error: "Gagal mengubah program." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Tidak boleh hapus jika program sudah dipakai santri
    const used = await prisma.riwayatSantri.findFirst({ where: { programId: id } });
    if (used) {
      return NextResponse.json(
        { error: "Program tidak bisa dihapus karena sudah ada santri yang terdaftar di program ini." },
        { status: 400 }
      );
    }

    await prisma.program.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting program:", error);
    return NextResponse.json({ error: "Gagal menghapus program." }, { status: 500 });
  }
}
