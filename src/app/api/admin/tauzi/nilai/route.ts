import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { checkPermission } from "@/lib/permission";

export async function PUT(request: Request) {
  const session = await getSession();
  const hasPermission = await checkPermission("tauzi_nilai");
  
  if (!session || (!hasPermission && session.role !== 'ADMIN')) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, nilaiMuqobalah, programRekomendasiId, penyimakNama } = body;

    if (!id) {
      return NextResponse.json({ error: "id peserta wajib dikirim" }, { status: 400 });
    }

    const updated = await prisma.pesertaTauzi.update({
      where: { id },
      data: {
        nilaiMuqobalah: nilaiMuqobalah !== undefined ? Number(nilaiMuqobalah) : null,
        programRekomendasiId: programRekomendasiId || null,
        penyimakNama: penyimakNama || null,
      },
      include: {
        programRekomendasi: {
          select: { nama_indo: true }
        }
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating nilai peserta:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan nilai peserta" },
      { status: 500 }
    );
  }
}
