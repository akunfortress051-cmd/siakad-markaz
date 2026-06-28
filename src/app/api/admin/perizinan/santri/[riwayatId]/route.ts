import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: Request, props: { params: Promise<{ riwayatId: string }> }) {
  const params = await props.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const perizinanList = await prisma.perizinan.findMany({
      where: {
        riwayatId: params.riwayatId,
        statusIzin: "AKTIF",
        tanggalMulai: { lte: today },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json(perizinanList);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch perizinan" }, { status: 500 });
  }
}
