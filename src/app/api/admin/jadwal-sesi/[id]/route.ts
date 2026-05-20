import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    
    const { jamBuka, jamTutup, toleransiMenit, isActive } = body;

    const updated = await prisma.jadwalSesi.update({
      where: { id },
      data: {
        jamBuka,
        jamTutup,
        toleransiMenit: Number(toleransiMenit),
        isActive: Boolean(isActive)
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update jadwal sesi", error);
    return NextResponse.json({ error: "Failed to update jadwal sesi" }, { status: 500 });
  }
}
