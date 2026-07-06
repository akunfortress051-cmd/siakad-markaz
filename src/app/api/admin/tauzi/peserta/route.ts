import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { checkPermission } from "@/lib/permission";

export async function GET(request: Request) {
  const session = await getSession();
  const hasPermissionHasil = await checkPermission("tauzi_hasil");
  const hasPermissionNilai = await checkPermission("tauzi_nilai");

  if (!session || (!hasPermissionHasil && !hasPermissionNilai && session.role !== 'ADMIN')) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sesiTauziId = searchParams.get("sesiTauziId");
  const programId = searchParams.get("programId");

  if (!sesiTauziId) {
    return NextResponse.json({ error: "sesiTauziId param wajib ada" }, { status: 400 });
  }

  try {
    const whereClause: any = { sesiTauziId };
    if (programId) {
      whereClause.programId = programId;
    }

    const pesertaList = await prisma.pesertaTauzi.findMany({
      where: whereClause,
      include: {
        santri: {
          select: { nama: true, id: true }
        },
        program: {
          select: { nama_indo: true, nama_arab: true }
        },
        programRekomendasi: {
          select: { nama_indo: true, nama_arab: true }
        }
      },
      orderBy: {
        santri: {
          nama: 'asc'
        }
      }
    });

    return NextResponse.json(pesertaList);
  } catch (error) {
    console.error("Error fetching peserta tauzi:", error);
    return NextResponse.json({ error: "Gagal mengambil data peserta ujian" }, { status: 500 });
  }
}
