import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { SesiKelas } from "@prisma/client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { userId } = await params;
    const assignments = await prisma.pengajarSesi.findMany({
      where: { userId },
      include: {
        kelas: {
          select: {
            nama: true
          }
        }
      }
    });
    return NextResponse.json(assignments);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { userId } = await params;
    const { assignments } = await request.json(); // Array of { kelasId: string, sesi: SesiKelas }

    if (!Array.isArray(assignments)) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }

    // Ganti semua alokasi sesi mengajar untuk user ini dalam satu transaksi
    await prisma.$transaction([
      prisma.pengajarSesi.deleteMany({
        where: { userId }
      }),
      prisma.pengajarSesi.createMany({
        data: assignments.map((a: any) => ({
          userId,
          kelasId: a.kelasId,
          sesi: a.sesi as SesiKelas
        }))
      })
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to save assignments" }, { status: 500 });
  }
}
