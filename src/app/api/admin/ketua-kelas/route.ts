import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { requirePermission } from '@/lib/permission';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const kelasId = searchParams.get('kelasId');

    const where: any = { isActive: true };
    if (kelasId && kelasId !== 'ALL') {
      where.kelasId = kelasId;
    }

    const ketuaKelas = await prisma.ketuaKelas.findMany({
      where,
      include: {
        kelas: { select: { nama: true } },
        santri: { select: { nama: true, id: true, isAktif: true } },
      },
      orderBy: { kelas: { nama: 'asc' } },
    });

    return NextResponse.json({ success: true, data: ketuaKelas });
  } catch (error) {
    console.error('Error fetching ketua kelas:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Note: since this is an admin feature, we'll verify if the user has auth/permission
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { kelasId, santriId } = await request.json();

    if (!kelasId || !santriId) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    // Gunakan transaction untuk memastikan atomicity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Nonaktifkan ketua kelas yang lama di kelas ini
      await tx.ketuaKelas.updateMany({
        where: { kelasId, isActive: true },
        data: { isActive: false },
      });

      // 2. Buat record baru
      const baru = await tx.ketuaKelas.create({
        data: {
          kelasId,
          santriId,
          isActive: true,
        },
        include: {
          kelas: { select: { nama: true } },
          santri: { select: { nama: true, id: true, isAktif: true } },
        }
      });

      return baru;
    });

    return NextResponse.json({ success: true, data: result, message: 'Berhasil menetapkan ketua kelas' });
  } catch (error) {
    console.error('Error setting ketua kelas:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan saat menyimpan data' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const kelasId = searchParams.get('kelasId');

    if (!kelasId) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    await prisma.ketuaKelas.updateMany({
      where: { kelasId, isActive: true },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true, message: 'Berhasil menonaktifkan fitur berita acara untuk kelas ini' });
  } catch (error) {
    console.error('Error disabling ketua kelas:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan saat menghapus data' }, { status: 500 });
  }
}
