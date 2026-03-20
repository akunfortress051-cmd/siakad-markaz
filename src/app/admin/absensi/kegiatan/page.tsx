import { getProgramCatalog } from "@/lib/app-data";
import { AbsensiKegiatanClient } from "@/components/admin/absensi-kegiatan-client";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AbsensiKegiatanPage() {
  const [programList, kegiatanList] = await Promise.all([
    getProgramCatalog(),
    prisma.kategoriKegiatan.findMany({ orderBy: { nama: "asc" } }),
  ]);

  return <AbsensiKegiatanClient programList={programList} kegiatanList={kegiatanList} />;
}
