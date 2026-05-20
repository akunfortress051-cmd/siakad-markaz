import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const jadwalSesi = await prisma.jadwalSesi.findMany({
      orderBy: { sesi: 'asc' }
    });
    return NextResponse.json(jadwalSesi);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch jadwal sesi" }, { status: 500 });
  }
}
