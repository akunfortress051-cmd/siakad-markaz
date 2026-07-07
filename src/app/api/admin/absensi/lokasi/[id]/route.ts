import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    
    const updateData: any = {};
    if (body.nama !== undefined) updateData.nama = body.nama.trim();
    if (body.latitude !== undefined) updateData.latitude = body.latitude;
    if (body.longitude !== undefined) updateData.longitude = body.longitude;
    if (body.radius !== undefined) updateData.radius = body.radius;
    if (body.aktif !== undefined) updateData.aktif = body.aktif;

    const lokasi = await prisma.lokasiKegiatan.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ success: true, lokasi });
  } catch (error) {
    return NextResponse.json({ error: "Gagal mengupdate lokasi kegiatan" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await prisma.lokasiKegiatan.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Gagal menghapus lokasi kegiatan" }, { status: 500 });
  }
}
