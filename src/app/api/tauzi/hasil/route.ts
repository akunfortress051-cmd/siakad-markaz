import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getTauziSession } from '@/lib/tauzi-auth';

export async function GET() {
  const session = await getTauziSession();
  if (!session || !session.pesertaId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const peserta = await prisma.pesertaTauzi.findUnique({
      where: { id: session.pesertaId },
      include: {
        santri: { select: { nama: true, id: true } },
        program: { select: { nama_indo: true } }
      }
    });

    if (!peserta) return NextResponse.json({ error: 'Data peserta tidak valid' }, { status: 401 });
    if (!peserta.sudahUjian) return NextResponse.json({ error: 'Ujian belum selesai' }, { status: 403 });

    // Ambil soal, jawaban user, dan jawaban yang benar
    const soalList = await prisma.soalTauzi.findMany({
      where: {
        sesiTauziId: peserta.sesiTauziId,
        programId: peserta.programId
      },
      select: {
        id: true,
        pertanyaan: true,
        urutan: true,
        jawabanList: {
          select: {
            id: true,
            teks: true,
            isCorrect: true, 
            urutan: true
          },
          orderBy: { urutan: 'asc' }
        },
        responseSantriList: {
          where: { pesertaId: peserta.id },
          select: { jawabanId: true }
        }
      },
      orderBy: { urutan: 'asc' }
    });

    // Formatting response
    const breakdown = soalList.map(soal => {
      const userAnswerId = soal.responseSantriList[0]?.jawabanId;
      const correctJawaban = soal.jawabanList.find(j => j.isCorrect);
      
      return {
        id: soal.id,
        urutan: soal.urutan,
        pertanyaan: soal.pertanyaan,
        jawabanList: soal.jawabanList,
        userAnswerId: userAnswerId || null,
        correctAnswerId: correctJawaban?.id || null,
        isCorrect: userAnswerId === correctJawaban?.id
      };
    });

    return NextResponse.json({
      peserta: {
        nama: peserta.santri.nama,
        nis: peserta.santri.id,
        program: peserta.program?.nama_indo || '-'
      },
      nilaiSyafawi: peserta.nilaiSyafawi,
      breakdown
    });
  } catch (error) {
    console.error('Error fetching tauzi hasil:', error);
    return NextResponse.json({ error: 'Gagal mengambil hasil ujian' }, { status: 500 });
  }
}
