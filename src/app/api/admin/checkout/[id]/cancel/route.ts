import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PUT(req: NextRequest, context: { params: { id: string } }) {
  const params = await context.params;
  const pengajuanId = params.id;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Admin permission required? Let's say all admins can cancel it if needed, or specific roles.
  // For now, allow logged in admin.

  try {
    const pengajuan = await prisma.checkoutPengajuan.findUnique({
      where: { id: pengajuanId }
    });

    if (!pengajuan) {
      return NextResponse.json({ error: "Pengajuan tidak ditemukan" }, { status: 404 });
    }

    if (pengajuan.status === "DIBATALKAN") {
      return NextResponse.json({ error: "Pengajuan sudah dibatalkan." }, { status: 400 });
    }

    // Wrap in transaction
    await prisma.$transaction(async (tx) => {
      await tx.checkoutPengajuan.update({
        where: { id: pengajuanId },
        data: { status: "DIBATALKAN" }
      });

      // Update santri status to not checked out if it was already checked out
      if (pengajuan.status === "DISETUJUI") {
        await tx.santriInternal.update({
          where: { id: pengajuan.santriId },
          data: { isCheckedOut: false }
        });
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error cancelling checkout:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
