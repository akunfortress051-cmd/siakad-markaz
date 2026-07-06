import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSantriSession } from '@/lib/santri-auth';

export async function GET() {
  const session = await getSantriSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const activeSesiList = await prisma.sesiTauzi.findMany({
      where: { isActive: true },
      take: 1
    });

    if (activeSesiList.length === 0) {
      return NextResponse.json({ aktif: false });
    }

    const sesiTauzi = activeSesiList[0];
    const peserta = await prisma.pesertaTauzi.findUnique({
      where: {
        sesiTauziId_santriId: {
          sesiTauziId: sesiTauzi.id,
          santriId: session.santriId
        }
      },
      include: {
        program: true
      }
    });

    // We also need programs list to allow them to choose
    const programs = await prisma.program.findMany({
      select: { id: true, nama_indo: true },
      orderBy: { nama_indo: 'asc' }
    });

    return NextResponse.json({
      aktif: true,
      sesi: sesiTauzi,
      peserta: peserta || null,
      programs
    });
  } catch (error) {
    console.error('Error fetching tauzi status:', error);
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

    const activeSesiList = await prisma.sesiTauzi.findMany({
      where: { isActive: true },
      take: 1
    });

    if (activeSesiList.length === 0) {
      return NextResponse.json({ error: 'Tidak ada sesi terbuka' }, { status: 403 });
    }

    const sesiTauzi = activeSesiList[0];

    // Cek apakah dia sudah pernah mendaftar di database
    // Gunakan upsert agar jika belum ada dibuat, jika ada di-update.
    const upserted = await prisma.pesertaTauzi.upsert({
      where: {
        sesiTauziId_santriId: {
          sesiTauziId: sesiTauzi.id,
          santriId: session.santriId
        }
      },
      update: {
        programId: programId
      },
      create: {
        sesiTauziId: sesiTauzi.id,
        santriId: session.santriId,
        programId: programId
      }
    });

    return NextResponse.json({ success: true, peserta: upserted });
  } catch (error) {
    console.error('Error in Tauzi pilih program:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem' }, { status: 500 });
  }
}
