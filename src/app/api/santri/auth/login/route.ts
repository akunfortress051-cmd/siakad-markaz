import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createSantriSession } from '@/lib/santri-auth';

export async function POST(request: Request) {
  try {
    const { nis } = await request.json();

    if (!nis || typeof nis !== 'string' || nis.trim().length === 0) {
      return NextResponse.json(
        { error: 'NIS harus diisi' },
        { status: 400 }
      );
    }

    const santri = await prisma.santriInternal.findUnique({
      where: { id: nis.trim() },
    });

    if (!santri) {
      return NextResponse.json(
        { error: 'NIS tidak ditemukan. Pastikan NIS yang dimasukkan sudah benar.' },
        { status: 404 }
      );
    }

    await createSantriSession({
      santriId: santri.id,
      nama: santri.nama || 'Santri',
      isAktif: santri.isAktif,
    });

    return NextResponse.json({
      success: true,
      redirect: '/santri/dashboard',
    });
  } catch (error) {
    console.error('Santri login error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem' },
      { status: 500 }
    );
  }
}
