import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getTauziSession } from '@/lib/tauzi-auth';

export async function GET() {
  const session = await getTauziSession();
  if (!session || !session.programId) {
    return NextResponse.json({ error: 'Unauthorized / Belum pilih program' }, { status: 401 });
  }

  try {
    // Cek peserta
    if (!session.pesertaId) {
      return NextResponse.json({ error: 'Peserta ID tidak ditemukan' }, { status: 401 });
    }

    const peserta = await prisma.pesertaTauzi.findUnique({
      where: { id: session.pesertaId },
      include: {
        santri: { select: { nama: true, id: true } },
        program: { select: { nama_indo: true } }
      }
    });

    if (!peserta) {
      return NextResponse.json({ error: 'Data peserta tidak valid' }, { status: 401 });
    }

    if (peserta.sudahUjian) {
      return NextResponse.json({ error: 'Anda sudah menyelesaikan ujian' }, { status: 403 });
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
          },
          orderBy: { urutan: 'asc' }
        }
      },
      orderBy: { urutan: 'asc' }
    });

    return NextResponse.json({
      peserta: {
        nama: peserta.santri.nama,
        nis: peserta.santri.id,
        program: peserta.program?.nama_indo || '-'
      },
      soalList
    });
  } catch (error) {
    console.error('Error fetching soal tauzi santri:', error);
    return NextResponse.json({ error: 'Gagal mengambil data soal' }, { status: 500 });
  }
}
