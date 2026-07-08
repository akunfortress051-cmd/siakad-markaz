import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const config = await prisma.checkoutApproverConfig.findMany({
      include: {
        user: { select: { nama: true, username: true } },
      },
      orderBy: [
        { kategori: "asc" },
        { urutan: "asc" }
      ]
    });
    return NextResponse.json({ data: config });
  } catch (error) {
    console.error("Error fetching checkout config:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { kategori, userId, label, urutan, tipe = "USER" } = body;

    if (!kategori || !label) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    if (tipe === "USER" && !userId) {
      return NextResponse.json({ error: "User harus dipilih untuk tipe USER" }, { status: 400 });
    }

    // Cek duplikasi manual karena uniq constraint dihapus
    if (tipe === "USER") {
      const existingUserConfig = await prisma.checkoutApproverConfig.findFirst({
        where: { kategori, userId, tipe: "USER" }
      });
      if (existingUserConfig) {
        return NextResponse.json({ error: "User sudah di-assign untuk kategori ini" }, { status: 400 });
      }
    } else {
      const existingDynamic = await prisma.checkoutApproverConfig.findFirst({
        where: { kategori, tipe }
      });
      if (existingDynamic) {
        return NextResponse.json({ error: `Tipe ${tipe} sudah di-assign untuk kategori ini` }, { status: 400 });
      }
    }

    const config = await prisma.checkoutApproverConfig.create({
      data: {
        kategori,
        tipe,
        userId: tipe === "USER" ? userId : null,
        label,
        urutan: urutan || 0,
      }
    });

    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error("Error creating config:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID config tidak ditemukan" }, { status: 400 });
  }

  try {
    await prisma.checkoutApproverConfig.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting config:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
