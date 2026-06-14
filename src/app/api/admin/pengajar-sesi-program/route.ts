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
    const data = await prisma.pengajarSesiProgram.findMany({
      include: {
        user: { select: { id: true, nama: true, role: true } },
        program: { select: { id: true, nama_indo: true } }
      }
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error("Gagal memuat pengajar sesi program", error);
    return NextResponse.json({ error: "Failed to fetch pengajar sesi program" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  const hasPerm = await checkPermission("jadwal_mengajar_edit");
  if (!session || !hasPerm) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { programId, sesi, userId } = body;

    if (!programId || !sesi || !userId) {
      return NextResponse.json({ error: "Parameter tidak lengkap" }, { status: 400 });
    }

    const data = await prisma.pengajarSesiProgram.upsert({
      where: {
        userId_programId_sesi: { userId, programId, sesi }
      },
      update: {},
      create: {
        userId,
        programId,
        sesi
      }
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Gagal menyimpan pengajar sesi program", error);
    return NextResponse.json({ error: "Gagal menyimpan pengajar sesi program" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getSession();
  const hasPerm = await checkPermission("jadwal_mengajar_edit");
  if (!session || !hasPerm) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    await prisma.pengajarSesiProgram.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Gagal menghapus pengajar sesi program", error);
    return NextResponse.json({ error: "Gagal menghapus pengajar sesi program" }, { status: 500 });
  }
}
