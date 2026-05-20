import { requirePermission } from "@/lib/permission";
import { Suspense } from "react";
import { Metadata } from "next";
import { RekapFilterClient } from "@/components/admin/rekap-filter-client";
import { AbsensiRekapDetailClient } from "@/components/admin/absensi-rekap-detail-client";

export const metadata: Metadata = {
  title: "Rekap Absen Kegiatan - Admin Panel",
};

export const dynamic = "force-dynamic";

export default async function RekapKegiatanPage() {
  await requirePermission("rekap_kegiatan");
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 pb-2">
        <h1 className="text-3xl font-black text-slate-900 md:text-4xl">
          Rekap Absen Kegiatan
        </h1>
        <p className="text-base text-slate-500 max-w-2xl">
          Laporan kehadiran santri pada kegiatan ekstrakurikuler / agenda.
        </p>
      </div>

      <Suspense fallback={<div className="animate-pulse p-4 text-slate-400 font-medium">Memuat Filter...</div>}>
        <RekapFilterClient type="kegiatan" title="Rincian Absen Kegiatan" useUsbu={false} />
      </Suspense>

      <Suspense fallback={<div className="animate-pulse p-10 text-center text-slate-400 font-medium">Memuat Rincian...</div>}>
        <AbsensiRekapDetailClient />
      </Suspense>
    </div>
  );
}
