import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'MUDABIR' && session.role !== 'PENGAJAR')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const kelasId = searchParams.get('kelasId');
    const isAktif = searchParams.get('isAktif');

    const where: any = {};
    if (kelasId) {
       where.riwayatRecords = {
          some: { kelasId }
       };
    }
    if (isAktif !== null) where.isAktif = isAktif === 'true';

    const santriList = await prisma.santriInternal.findMany({
      where,
      select: {
        id: true,
        nama: true,
        isAktif: true,
      },
      orderBy: { nama: 'asc' }
    });

    return NextResponse.json({ success: true, data: santriList });
  } catch (error) {
    console.error('Error fetching santri list:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem' }, { status: 500 });
  }
}
