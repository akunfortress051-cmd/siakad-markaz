import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      nama, 
      usbu1StartDate, usbu1EndDate, usbu1Active,
      usbu2StartDate, usbu2EndDate, usbu2Active,
      usbu3StartDate, usbu3EndDate, usbu3Active
    } = body;

    if (!nama) {
      return NextResponse.json({ error: "Nama Dufah diperlukan" }, { status: 400 });
    }

    const dufah = await prisma.dufah.findUnique({
      where: { nama },
    });

    if (!dufah) {
      return NextResponse.json({ error: "Angkatan tidak ditemukan" }, { status: 404 });
    }

    const parseDate = (d: string | null | undefined) => d ? new Date(d) : null;

    const updated = await prisma.dufah.update({
      where: { nama },
      data: {
        usbu1StartDate: parseDate(usbu1StartDate),
        usbu1EndDate: parseDate(usbu1EndDate),
        usbu1Active: Boolean(usbu1Active),
        usbu2StartDate: parseDate(usbu2StartDate),
        usbu2EndDate: parseDate(usbu2EndDate),
        usbu2Active: Boolean(usbu2Active),
        usbu3StartDate: parseDate(usbu3StartDate),
        usbu3EndDate: parseDate(usbu3EndDate),
        usbu3Active: Boolean(usbu3Active),
      },
    });

    return NextResponse.json({ success: true, dufah: updated });
  } catch (error: any) {
    console.error("Usbu configuration error:", error);
    return NextResponse.json(
      { error: "Gagal memproses pengaturan Usbu'" },
      { status: 500 }
    );
  }
}

