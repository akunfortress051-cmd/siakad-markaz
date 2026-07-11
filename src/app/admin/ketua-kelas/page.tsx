import { Metadata } from 'next';
import { getProgramCatalog } from '@/lib/app-data';
import { getSession } from '@/lib/auth';
import { requirePermission } from '@/lib/permission';
import { KetuaKelasClient } from '@/components/admin/ketua-kelas-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Kelola Ketua Kelas - Admin Panel',
};

export default async function KetuaKelasPage() {
  // Gunakan permission yang relevan atau batasi cuma untuk ADMIN
  await requirePermission('data_santri'); 
  
  const programCatalog = await getProgramCatalog();
  
  // Extract all valid classes (mengabaikan kelas Akbarnas khusus jika ada)
  const allKelas = programCatalog.flatMap(p => 
    p.kelasList.map(k => ({
      id: k.id,
      nama: k.nama,
      programId: p.id,
      programNama: p.nama_indo
    }))
  ).sort((a, b) => a.nama.localeCompare(b.nama));

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black md:text-4xl text-[var(--color-primary)]">
          Kelola Ketua Kelas
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] max-w-2xl">
          Atur penunjukan santri sebagai ketua kelas per kelas, yang bertugas memverifikasi kehadiran guru melalui sistem Berita Acara.
        </p>
      </div>

      <KetuaKelasClient kelasList={allKelas} />
    </div>
  );
}
