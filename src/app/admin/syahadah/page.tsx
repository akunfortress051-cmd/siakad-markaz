import { getDashboardSantriRows, getProgramCatalog } from "@/lib/app-data";
import { SyahadahClient } from "@/components/admin/syahadah-client";
import { Metadata } from "next";
import { requirePermission } from "@/lib/permission";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Data Syahadah - Admin Panel",
};

export default async function SyahadahPage() {
  await requirePermission("data_syahadah");
  const allRows = await getDashboardSantriRows();
  const santriRows = allRows.filter((santri: any) => santri.isAktif);
  const programList = await getProgramCatalog();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black text-slate-900 md:text-4xl">
          Data Syahadah
        </h1>
        <p className="text-base text-slate-500 max-w-2xl">
          Pusat pengelolaan kelulusan, input nilai, pencetakan syahadah (sertifikat), & tasmi' santri secara massal maupun individu.
        </p>
      </div>

      <SyahadahClient santriRows={santriRows} programList={programList} />
    </div>
  );
}
