import { requirePermission, checkPermission } from "@/lib/permission";
import { Metadata } from "next";
import { TabirotClient } from "@/components/admin/tabirot-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Absen Ta'birot - Admin Panel",
};

export default async function AbsensiTabirotPage() {
  await requirePermission("absen_tabirot");
  const canEdit = await checkPermission("absen_tabirot_edit");

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black md:text-4xl ">
          Absen Ta'birot
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] max-w-2xl">
          Kelola kelompok santri berdasarkan nama tempat dan bulan ke-, serta lakukan pendataan absensi Ta'birot.
        </p>
      </div>
      <TabirotClient canEdit={canEdit} />
    </div>
  );
}
