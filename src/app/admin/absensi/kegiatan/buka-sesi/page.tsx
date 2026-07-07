import { requirePermission } from "@/lib/permission";
import { Metadata } from "next";
import prisma from "@/lib/prisma";
import { BukaSesiKegiatanClient } from "@/components/admin/buka-sesi-kegiatan-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Buka Sesi Absen - Admin Panel",
};

export default async function BukaSesiKegiatanPage() {
  await requirePermission("absen_kegiatan"); // Or you can create a specific permission for this
  
  const [kegiatanList, lokasiList] = await Promise.all([
    prisma.kategoriKegiatan.findMany({ where: { aktif: true }, orderBy: { nama: "asc" } }),
    prisma.lokasiKegiatan.findMany({ where: { aktif: true }, orderBy: { nama: "asc" } })
  ]);

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black md:text-4xl">
          Absen Mandiri (Geofencing)
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] max-w-2xl">
          Buka sesi untuk absensi mandiri santri melalui aplikasi (SIAKAD Santri). Hasilkan kode unik untuk sesi ini dan pilih lokasi GPS yang dibolehkan untuk absensi.
        </p>
      </div>
      <BukaSesiKegiatanClient kegiatanList={kegiatanList} lokasiList={lokasiList} />
    </div>
  );
}
