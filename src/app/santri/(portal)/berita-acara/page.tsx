import { Metadata } from 'next';
import { getSantriSession } from '@/lib/santri-auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { BeritaAcaraClient } from '@/components/santri/berita-acara-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Berita Acara - SIAKAD Santri',
};

export default async function SantriBeritaAcaraPage() {
  const session = await getSantriSession();
  if (!session) {
    redirect('/santri/login');
  }

  // Verifikasi apakah santri ini adalah ketua kelas aktif
  const ketuaKelas = await prisma.ketuaKelas.findFirst({
    where: {
      santriId: session.santriId,
      isActive: true,
    }
  });

  if (!ketuaKelas) {
    // Jika bukan ketua kelas, redirect kembali ke dashboard utama santri
    redirect('/santri/dashboard');
  }

  return <BeritaAcaraClient />;
}
