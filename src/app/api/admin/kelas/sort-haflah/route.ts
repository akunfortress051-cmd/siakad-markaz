import { requirePermission } from "@/lib/permission";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    await requirePermission("haflah_wada"); // Reuse same permission
    const body = await req.json();

    if (!Array.isArray(body)) {
      return NextResponse.json({ message: "Invalid payload format" }, { status: 400 });
    }

    // Body should be an array of { id: string, urutan_haflah: number }
    // Execute all updates in a transaction
    await prisma.$transaction(
      body.map((item: any) =>
        prisma.kelas.update({
          where: { id: item.id },
          data: { urutan_haflah: item.urutan_haflah },
        })
      )
    );

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("POST /api/admin/kelas/sort-haflah error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to update sorting" },
      { status: 500 }
    );
  }
}
