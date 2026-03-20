import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { nama, aktif } = await request.json();
    const kegiatan = await prisma.kategoriKegiatan.update({
      where: { id: params.id },
      data: {
        ...(nama && { nama: nama.trim() }),
        ...(aktif !== undefined && { aktif }),
      }
    });
    return NextResponse.json({ success: true, kegiatan });
  } catch (error) {
    return NextResponse.json({ error: "Gagal mengubah kegiatan" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.kategoriKegiatan.delete({
      where: { id: params.id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Gagal menghapus kegiatan. Mungkin karena sudah terdapat data absen di dalamnya." }, { status: 500 });
  }
}
