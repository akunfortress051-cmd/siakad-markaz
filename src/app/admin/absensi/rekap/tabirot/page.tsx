import { requirePermission } from "@/lib/permission";
import { Metadata } from "next";
import { RekapTabirotClient } from "@/components/admin/rekap-tabirot-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rekap Ta'birot - Admin Panel",
};

export default async function RekapTabirotPage() {
  await requirePermission("rekap_tabirot");

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black md:text-4xl text-[var(--color-text)] flex items-center gap-3">
          Rekap Absen Ta'birot
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] max-w-2xl">
          Lihat akumulasi kehadiran santri berdasarkan kelompok Ta'birot dan unduh laporannya.
        </p>
      </div>
      <RekapTabirotClient />
    </div>
  );
}
