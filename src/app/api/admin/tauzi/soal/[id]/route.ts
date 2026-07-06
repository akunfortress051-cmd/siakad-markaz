import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { checkPermission } from "@/lib/permission";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  const hasPermission = await checkPermission("tauzi_soal");
  if (!session || (!hasPermission && session.role !== 'ADMIN')) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { pertanyaan, urutan, jawabanList } = body;

    if (!pertanyaan || !jawabanList || jawabanList.length === 0) {
      return NextResponse.json({ error: "Pertanyaan dan jawaban tidak boleh kosong" }, { status: 400 });
    }

    // Pertama, hapus jawaban lama dan replace dengan yang baru
    // Kita gunakan transaksi untuk atomic operation
    const result = await prisma.$transaction(async (tx) => {
      await tx.jawabanTauzi.deleteMany({
        where: { soalId: id }
      });

      const updated = await tx.soalTauzi.update({
        where: { id },
        data: {
          pertanyaan,
          urutan,
          jawabanList: {
            create: jawabanList.map((j: any, index: number) => ({
              teks: j.teks,
              isCorrect: j.isCorrect || false,
              urutan: j.urutan ?? index + 1
            }))
          }
        },
        include: { jawabanList: true }
      });
      return updated;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating soal:", error);
    return NextResponse.json({ error: "Gagal mengupdate soal" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  const hasPermission = await checkPermission("tauzi_soal");
  if (!session || (!hasPermission && session.role !== 'ADMIN')) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await prisma.soalTauzi.delete({
      where: { id }
    });

    return NextResponse.json({ message: "Soal berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting soal:", error);
    return NextResponse.json({ error: "Gagal menghapus soal" }, { status: 500 });
  }
}
