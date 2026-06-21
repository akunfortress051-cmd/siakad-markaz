import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: Request, props: { params: Promise<{ nomorTasrih: string }> }) {
  const params = await props.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = await prisma.perizinan.findFirst({
      where: { nomorTasrih: params.nomorTasrih },
      include: {
        riwayat: {
          include: {
            santri: true,
            kelas: true
          }
        }
      }
    });

    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Fetch batas jam for KELUAR_PARE
    let batasJam = data.batasJam;
    if (data.tipeIzin === "KELUAR_PARE" && !batasJam) {
      const setting = await prisma.pengaturanPerizinan.findUnique({ where: { id: 1 } });
      batasJam = setting?.batasJamKeluarPare || 12;
    }

    // Fetch petugas name if available
    let petugasNama = null;
    if (data.createdBy) {
      const user = await prisma.user.findUnique({ where: { id: data.createdBy }, select: { nama: true } });
      if (user) petugasNama = user.nama;
    }

    return NextResponse.json({ ...data, batasJam, petugasNama });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch perizinan detail" }, { status: 500 });
  }
}
