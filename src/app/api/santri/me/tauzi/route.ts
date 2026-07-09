import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSantriSession } from '@/lib/santri-auth';

export async function GET() {
  const session = await getSantriSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const riwayatList = await prisma.riwayatSantri.findMany({
      where: { santriId: session.santriId },
      orderBy: { id: 'desc' },
      take: 1,
      include: { program: true }
    });

    const activeRiwayat = riwayatList.length > 0 ? riwayatList[0] : null;

    const programs = await prisma.program.findMany({
      select: { id: true, nama_indo: true },
      orderBy: { nama_indo: 'asc' }
    });

    return NextResponse.json({
      aktif: true,
      riwayat: activeRiwayat || null,
      programs
    });
  } catch (error) {
    console.error('Error fetching program status:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSantriSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { programId } = body;
    if (!programId) {
      return NextResponse.json({ error: 'Program tujuan wajib dipilih' }, { status: 400 });
    }

    const riwayatList = await prisma.riwayatSantri.findMany({
      where: { santriId: session.santriId },
      orderBy: { id: 'desc' },
      take: 1
    });

    if (riwayatList.length === 0) {
      return NextResponse.json({ error: 'Data riwayat tidak ditemukan, tidak bisa set program' }, { status: 400 });
    }

    const activeRiwayat = riwayatList[0];

    // Update the RiwayatSantri programId
    const updated = await prisma.riwayatSantri.update({
      where: { id: activeRiwayat.id },
      data: { programId: programId }
    });

    // Also update PesertaTauzi if they happen to exist in an active session
    const activeSesiList = await prisma.sesiTauzi.findMany({
      where: { isActive: true },
      take: 1
    });

    if (activeSesiList.length > 0) {
      const activeSesi = activeSesiList[0];
      await prisma.pesertaTauzi.upsert({
        where: {
          sesiTauziId_santriId: {
            sesiTauziId: activeSesi.id,
            santriId: session.santriId
          }
        },
        update: { programId },
        create: {
          sesiTauziId: activeSesi.id,
          santriId: session.santriId,
          programId: programId
        }
      });
    }

    return NextResponse.json({ success: true, riwayat: updated });
  } catch (error) {
    console.error('Error in Pilih program:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem' }, { status: 500 });
  }
}
