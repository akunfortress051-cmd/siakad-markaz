import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { mergeOnlineLayout, getDefaultOnlineLayout, OnlineLayoutData } from "@/lib/syahadah-online-layout";

// GET — ambil global online layout
export async function GET(req: NextRequest) {
  const template = await prisma.syahadahTemplate.findFirst({
    orderBy: { id: "asc" },
    select: { onlineLayoutData: true },
  });

  const layout = mergeOnlineLayout(template?.onlineLayoutData as Partial<OnlineLayoutData> | null);
  return NextResponse.json({ layout });
}

// POST — simpan global online layout
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { layoutData } = body;

    if (!layoutData) {
      return NextResponse.json({ error: "layoutData wajib diisi" }, { status: 400 });
    }

    const template = await prisma.syahadahTemplate.findFirst({ orderBy: { id: "asc" } });
    if (template) {
      await prisma.syahadahTemplate.update({
        where: { id: template.id },
        data: { onlineLayoutData: layoutData as any },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error saving global online layout:", err);
    return NextResponse.json({ error: "Gagal menyimpan layout" }, { status: 500 });
  }
}

// DELETE — reset global online layout ke default
export async function DELETE(req: NextRequest) {
  const template = await prisma.syahadahTemplate.findFirst({ orderBy: { id: "asc" } });
  if (template) {
    await prisma.syahadahTemplate.update({
      where: { id: template.id },
      data: { onlineLayoutData: Prisma.DbNull },
    });
  }

  return NextResponse.json({ success: true });
}
