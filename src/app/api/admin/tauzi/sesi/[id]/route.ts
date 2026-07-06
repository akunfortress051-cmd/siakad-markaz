import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { checkPermission } from "@/lib/permission";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  const hasPermission = await checkPermission("tauzi_sesi");
  if (!session || (!hasPermission && session.role !== 'ADMIN')) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { nama, dufahNama, isActive } = body;

    if (isActive) {
      await prisma.sesiTauzi.updateMany({
        where: { id: { not: id }, isActive: true },
        data: { isActive: false }
      });
    }

    const updated = await prisma.sesiTauzi.update({
      where: { id },
      data: {
        nama,
        dufahNama,
        isActive,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating sesi tauzi:", error);
    return NextResponse.json(
      { error: "Gagal mengupdate sesi tauzi'" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  const hasPermission = await checkPermission("tauzi_sesi");
  if (!session || (!hasPermission && session.role !== 'ADMIN')) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await prisma.sesiTauzi.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Sesi berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting sesi tauzi:", error);
    return NextResponse.json(
      { error: "Gagal menghapus sesi tauzi'" },
      { status: 500 }
    );
  }
}
