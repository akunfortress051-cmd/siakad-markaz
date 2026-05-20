import { requirePermission } from "@/lib/permission";
import { getDashboardSantriRows, getProgramCatalog } from "@/lib/app-data";
import { ManajemenKelasClient } from "@/components/admin/manajemen-kelas-client";

export const dynamic = "force-dynamic";

export default async function ManajemenKelasPage() {
  await requirePermission("manajemen_kelas");
  const allRows = await getDashboardSantriRows();
  const programList = await getProgramCatalog();

  // Hanya kelola santri aktif, atau bisa semua. Tapi Ijazah & Dashboard memfilter aktif.
  // Lebih baik hanya yang aktif agar relevan.
  const santriRows = allRows.filter((santri) => santri.isAktif);

  return (

    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black text-slate-900 md:text-4xl">
          Alokasi Kelas
        </h1>
        <p className="text-base text-slate-500 max-w-2xl">
          Gunakan fitur ini untuk menentukan kelas santri secara massal maupun individu.
        </p>
      </div>
      <ManajemenKelasClient santriRows={santriRows} programList={programList} />
    </div>
  );
}
