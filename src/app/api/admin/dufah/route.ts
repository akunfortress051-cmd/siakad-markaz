import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { checkPermission } from "@/lib/permission";

export async function GET() {
  try {
    const dufahList = await prisma.dufah.findMany({
      orderBy: { nama: "desc" },
    });

    return NextResponse.json(dufahList);
  } catch (error) {
    console.error("Error fetching dufah:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data angkatan" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  const hasPermission = await checkPermission("manajemen_dufah_edit");
  if (!session || !hasPermission) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { nama } = body;

    if (!nama) {
      return NextResponse.json(
        { error: "Nama angkatan wajib diisi" },
        { status: 400 }
      );
    }

    const newDufah = await prisma.dufah.create({
      data: {
        nama,
      },
    });

    return NextResponse.json(newDufah, { status: 201 });
  } catch (error: any) {
    console.error("Error creating dufah:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Nama angkatan sudah ada" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Gagal membuat angkatan baru" },
      { status: 500 }
    );
  }
}
