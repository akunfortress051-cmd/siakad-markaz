import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    let setting = await prisma.pengaturanPerizinan.findUnique({ where: { id: 1 } });
    
    // Auto-create if not exists
    if (!setting) {
      setting = await prisma.pengaturanPerizinan.create({
        data: { id: 1, batasJamKeluarPare: 12, batasJamAkhirKeluarPare: "19:00" }
      });
    }

    return NextResponse.json(setting);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch pengaturan perizinan" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { batasJamAkhirKeluarPare } = await request.json();

    if (batasJamAkhirKeluarPare === undefined) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    const updated = await prisma.pengaturanPerizinan.upsert({
      where: { id: 1 },
      update: { batasJamAkhirKeluarPare: String(batasJamAkhirKeluarPare) },
      create: { id: 1, batasJamAkhirKeluarPare: String(batasJamAkhirKeluarPare), batasJamKeluarPare: 12 }
    });

    return NextResponse.json({ success: true, updated });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update pengaturan perizinan" }, { status: 500 });
  }
}
