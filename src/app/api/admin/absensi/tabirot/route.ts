import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkPermission } from "@/lib/permission";

export async function GET() {
  try {
    const kelompokList = await prisma.kelompokTabirot.findMany({
      orderBy: [
        { tempat: "asc" },
        { bulanKe: "asc" },
      ],
      include: {
        _count: {
          select: { anggotaList: true },
        },
      },
    });
    return NextResponse.json({ success: true, data: kelompokList });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal mengambil data kelompok" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const hasAccess = await checkPermission("absen_tabirot_edit");
    if (!hasAccess) {
      return NextResponse.json({ error: "Anda tidak memiliki akses untuk menambah kelompok Ta'birot" }, { status: 403 });
    }

    const { tempat, bulanKe } = await request.json();
    if (!tempat || !bulanKe) {
      return NextResponse.json({ error: "Data tempat dan bulanKe harus diisi" }, { status: 400 });
    }

    const kelompok = await prisma.kelompokTabirot.create({
      data: {
        tempat,
        bulanKe: parseInt(bulanKe),
      },
    });

    return NextResponse.json({ success: true, data: kelompok });
  } catch (error: any) {
    console.error(error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Kelompok dengan nama tempat dan bulan tersebut sudah ada" }, { status: 400 });
    }
    return NextResponse.json({ error: "Gagal membuat kelompok" }, { status: 500 });
  }
}
