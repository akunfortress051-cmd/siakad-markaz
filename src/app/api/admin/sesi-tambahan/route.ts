import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { checkPermission } from "@/lib/permission";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sesiTambahan = await prisma.sesiTambahanProgram.findMany({
      include: {
        program: {
          select: { nama_indo: true }
        }
      },
      orderBy: [
        { sesi: 'asc' },
        { program: { nama_indo: 'asc' } }
      ]
    });
    return NextResponse.json(sesiTambahan);
  } catch (error) {
    console.error("Gagal memuat sesi tambahan", error);
    return NextResponse.json({ error: "Failed to fetch sesi tambahan" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  const hasPerm = await checkPermission("manajemen_sesi");
  if (!session || !hasPerm) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { programId, sesi, jamBuka, jamTutup, toleransiMenit, isActive } = body;

    if (!programId || !sesi || !jamBuka || !jamTutup) {
      return NextResponse.json({ error: "Parameter tidak lengkap" }, { status: 400 });
    }

    const data = await prisma.sesiTambahanProgram.upsert({
      where: {
        programId_sesi: { programId, sesi }
      },
      update: {
        jamBuka,
        jamTutup,
        toleransiMenit: toleransiMenit !== undefined ? Number(toleransiMenit) : 15,
        isActive: Boolean(isActive)
      },
      create: {
        programId,
        sesi,
        jamBuka,
        jamTutup,
        toleransiMenit: toleransiMenit !== undefined ? Number(toleransiMenit) : 15,
        isActive: Boolean(isActive)
      }
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Gagal menyimpan sesi tambahan", error);
    return NextResponse.json({ error: "Gagal menyimpan sesi tambahan" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getSession();
  const hasPerm = await checkPermission("manajemen_sesi");
  if (!session || !hasPerm) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    await prisma.sesiTambahanProgram.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Gagal menghapus sesi tambahan", error);
    return NextResponse.json({ error: "Gagal menghapus sesi tambahan" }, { status: 500 });
  }
}
