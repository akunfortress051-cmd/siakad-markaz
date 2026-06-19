import { requirePermission } from "@/lib/permission";
import { Suspense } from "react";
import { Metadata } from "next";
import { RekapFilterClient } from "@/components/admin/rekap-filter-client";
import { RekapPengajarClient } from "@/components/admin/rekap-pengajar-client";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Rekap Absen Pengajar - Admin Panel",
};

export const dynamic = "force-dynamic";

export default async function RekapPengajarPage() {
  await requirePermission("rekap_pengajar");
  const session = await getSession();
  const userRole = session?.role || "";
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 pb-2">
        <h1 className="text-3xl font-black md:text-4xl ">
          Rekap Absen Pengajar
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] max-w-2xl">
          Laporan kehadiran dan kelengkapan atribut asatidzah (pengajar) berdasarkan Usbu' (Pekan).
        </p>
      </div>

      <Suspense fallback={<div className="animate-pulse p-4 text-[var(--color-text-subtle)] font-medium">Memuat Filter...</div>}>
        <RekapFilterClient type="pengajar" title="Rincian Absen Pengajar" useUsbu={true} />
      </Suspense>

      <Suspense fallback={<div className="animate-pulse p-10 text-center text-[var(--color-text-subtle)] font-medium">Memuat Rincian...</div>}>
        <RekapPengajarClient userRole={userRole} />
      </Suspense>
    </div>
  );
}
