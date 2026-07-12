import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkPermission } from "@/lib/permission";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const hasAccess = await checkPermission("absen_tabirot_edit");
    if (!hasAccess) {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }

    const { id } = await params;
    const { santriIds } = await request.json();
    if (!santriIds || !Array.isArray(santriIds)) {
      return NextResponse.json({ error: "santriIds harus berupa array string" }, { status: 400 });
    }

    const dataPayload = santriIds.map((santriId: string) => ({
      kelompokId: id,
      santriId,
    }));

    // Skip duplicates automatically by using createMany
    const result = await prisma.anggotaTabirot.createMany({
      data: dataPayload,
      skipDuplicates: true,
    });

    return NextResponse.json({ success: true, count: result.count });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal menambahkan anggota" }, { status: 500 });
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
    // ExpectsantriId in the body for deletion
    const { santriId } = await request.json();
    
    if (!santriId) {
      return NextResponse.json({ error: "santriId harus diisi" }, { status: 400 });
    }

    await prisma.anggotaTabirot.delete({
      where: {
        kelompokId_santriId: {
          kelompokId: id,
          santriId: santriId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal menghapus anggota" }, { status: 500 });
  }
}
