import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getTauziSession } from '@/lib/tauzi-auth';

export async function GET() {
  const session = await getTauziSession();
  if (!session || !session.programId) {
    return NextResponse.json({ error: 'Unauthorized / Belum pilih program' }, { status: 401 });
  }

  try {
    // Cek apakah peserta sudah ujian
    if (session.pesertaId) {
      const peserta = await prisma.pesertaTauzi.findUnique({
        where: { id: session.pesertaId },
        select: { sudahUjian: true }
      });
      if (peserta?.sudahUjian) {
        return NextResponse.json({ error: 'Anda sudah menyelesaikan ujian' }, { status: 403 });
      }
    }

    const soalList = await prisma.soalTauzi.findMany({
      where: {
        sesiTauziId: session.sesiTauziId,
        programId: session.programId
      },
      select: {
        id: true,
        pertanyaan: true,
        urutan: true,
        jawabanList: {
          select: {
            id: true,
            teks: true,
            urutan: true
            // isCorrect jangan dilampirkan ke frontend!
          },
          orderBy: { urutan: 'asc' }
        }
      },
      orderBy: { urutan: 'asc' }
    });

    return NextResponse.json(soalList);
  } catch (error) {
    console.error('Error fetching soal tauzi santri:', error);
    return NextResponse.json({ error: 'Gagal mengambil data soal' }, { status: 500 });
  }
}
