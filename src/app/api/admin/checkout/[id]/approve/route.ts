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

  try {
    const body = await req.json();
    const { status, catatan } = body; // "DISETUJUI" | "DITOLAK"

    if (!["DISETUJUI", "DITOLAK"].includes(status)) {
      return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
    }

    const pengajuan = await prisma.checkoutPengajuan.findUnique({
      where: { id: pengajuanId },
      include: { approvals: true }
    });

    if (!pengajuan) {
      return NextResponse.json({ error: "Pengajuan tidak ditemukan" }, { status: 404 });
    }

    if (pengajuan.status !== "MENUNGGU") {
      return NextResponse.json({ error: "Pengajuan ini sudah tidak menunggu persetujuan (sudah final)." }, { status: 400 });
    }

    const myApproval = pengajuan.approvals.find(a => a.userId === session.userId);
    if (!myApproval) {
      return NextResponse.json({ error: "Anda bukan approver untuk pengajuan ini." }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update the specific approval record
      await tx.checkoutApproval.update({
        where: { id: myApproval.id },
        data: {
          status,
          catatan: catatan || null,
          respondedAt: new Date()
        }
      });

      // 2. Check complete status
      const updatedApprovals = await tx.checkoutApproval.findMany({
        where: { pengajuanId }
      });

      const hasRejected = updatedApprovals.some(a => a.status === "DITOLAK");
      const allApproved = updatedApprovals.every(a => a.status === "DISETUJUI");

      if (hasRejected) {
        await tx.checkoutPengajuan.update({
          where: { id: pengajuanId },
          data: { status: "DITOLAK" }
        });
      } else if (allApproved) {
        await tx.checkoutPengajuan.update({
          where: { id: pengajuanId },
          data: { status: "DISETUJUI" }
        });

        await tx.santriInternal.update({
          where: { id: pengajuan.santriId },
          data: { isCheckedOut: true }
        });
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error approving checkout:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
