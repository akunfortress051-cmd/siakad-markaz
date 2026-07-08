import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Filter based on user's role/permissions if necessary. For now, we will return requests
  // where the user is an approver, OR they have global 'checkout_admin' permission.
  // Actually, simplest is to return all checkout pengajuan, and frontend logic 
  // will decide if current user can approve based on approvals array.
  
  const searchParams = req.nextUrl.searchParams;
  const statusFilter = searchParams.get("status") || "ALL";

  try {
    const whereClause: any = {};
    if (statusFilter !== "ALL") {
      whereClause.status = statusFilter;
    }

    const pengajuanList = await prisma.checkoutPengajuan.findMany({
      where: whereClause,
      include: {
        santri: {
          select: {
            nama: true,
            kategori: true,
            kabupaten: true,
            sakan: true,
            kamar: true,
          }
        },
        riwayat: {
          include: {
            program: true,
            kelas: true,
          }
        },
        approvals: {
          orderBy: { id: "asc" },
          include: {
            user: { select: { nama: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ success: true, data: pengajuanList });
  } catch (error) {
    console.error("Error fetching checkout admin list:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
