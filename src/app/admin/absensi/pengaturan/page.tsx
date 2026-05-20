import { requirePermission } from "@/lib/permission";
import { Metadata } from "next";
import { PengaturanKegiatanClient } from "@/components/admin/pengaturan-kegiatan-client";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pengaturan Kegiatan - Admin Panel",
};

export default async function PengaturanKegiatanPage() {
  await requirePermission("manajemen_dufah");
  const kegiatanList = await prisma.kategoriKegiatan.findMany({
    orderBy: { nama: "asc" }
  });

  return <PengaturanKegiatanClient initialList={kegiatanList} />;
}
