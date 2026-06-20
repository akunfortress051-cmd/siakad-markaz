import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { mergeOnlineLayout, getDefaultOnlineLayout, OnlineLayoutData } from "@/lib/syahadah-online-layout";

// GET — ambil layout untuk record tertentu
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ layout: getDefaultOnlineLayout() });
  }

  const record = await prisma.syahadahOnline.findUnique({
    where: { id },
    select: { layoutData: true },
  });

  const layout = mergeOnlineLayout(record?.layoutData as Partial<OnlineLayoutData> | null);
  return NextResponse.json({ layout });
}

// POST — simpan layout
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, layoutData } = body;

    if (!id || !layoutData) {
      return NextResponse.json({ error: "id dan layoutData wajib diisi" }, { status: 400 });
    }

    await prisma.syahadahOnline.update({
      where: { id },
      data: { layoutData: layoutData as any },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error saving online layout:", err);
    return NextResponse.json({ error: "Gagal menyimpan layout" }, { status: 500 });
  }
}

// DELETE — reset layout ke default
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "id wajib diisi" }, { status: 400 });

  await prisma.syahadahOnline.update({
    where: { id },
    data: { layoutData: Prisma.DbNull },
  });

  return NextResponse.json({ success: true });
}
