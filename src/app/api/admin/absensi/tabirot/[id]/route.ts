import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkPermission } from "@/lib/permission";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const kelompok = await prisma.kelompokTabirot.findUnique({
      where: { id },
      include: {
        anggotaList: {
          include: {
            santri: true,
          },
        },
      },
    });

    if (!kelompok) {
      return NextResponse.json({ error: "Kelompok tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: kelompok });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal mengambil data kelompok" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const hasAccess = await checkPermission("absen_tabirot_edit");
    if (!hasAccess) {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }

    const { id } = await params;
    const { tempat, bulanKe, isActive } = await request.json();

    const kelompok = await prisma.kelompokTabirot.update({
      where: { id },
      data: {
        ...(tempat !== undefined && { tempat }),
        ...(bulanKe !== undefined && { bulanKe: parseInt(bulanKe) }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ success: true, data: kelompok });
  } catch (error: any) {
    console.error(error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Kombinasi tempat dan bulan sudah ada" }, { status: 400 });
    }
    return NextResponse.json({ error: "Gagal mengupdate kelompok" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const hasAccess = await checkPermission("absen_tabirot_edit");
    if (!hasAccess) {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }

    const { id } = await params;
    await prisma.kelompokTabirot.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal menghapus kelompok" }, { status: 500 });
  }
}
