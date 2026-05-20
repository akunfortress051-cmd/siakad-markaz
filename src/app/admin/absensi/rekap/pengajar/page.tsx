import { Suspense } from "react";
import { Metadata } from "next";
import { RekapFilterClient } from "@/components/admin/rekap-filter-client";
import { RekapPengajarClient } from "@/components/admin/rekap-pengajar-client";

export const metadata: Metadata = {
  title: "Rekap Absen Pengajar - Admin Panel",
};

export const dynamic = "force-dynamic";

export default function RekapPengajarPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 pb-2">
        <h1 className="text-3xl font-black text-slate-900 md:text-4xl">
          Rekap Absen Pengajar
        </h1>
        <p className="text-base text-slate-500 max-w-2xl">
          Laporan kehadiran dan kelengkapan atribut asatidzah (pengajar) berdasarkan Usbu' (Pekan).
        </p>
      </div>

      <Suspense fallback={<div className="animate-pulse p-4 text-slate-400 font-medium">Memuat Filter...</div>}>
        <RekapFilterClient type="pengajar" title="Rincian Absen Pengajar" useUsbu={true} />
      </Suspense>

      <Suspense fallback={<div className="animate-pulse p-10 text-center text-slate-400 font-medium">Memuat Rincian...</div>}>
        <RekapPengajarClient />
      </Suspense>
    </div>
  );
}
