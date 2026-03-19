import { getDashboardSantriRows, getKelasCatalog } from "@/lib/app-data";
import { ManajemenKelasClient } from "@/components/admin/manajemen-kelas-client";

export const dynamic = "force-dynamic";

export default async function ManajemenKelasPage() {
  const allRows = await getDashboardSantriRows();
  const kelasList = await getKelasCatalog();
  
  // Hanya kelola santri aktif, atau bisa semua. Tapi Ijazah & Dashboard memfilter aktif.
  // Lebih baik hanya yang aktif agar relevan.
  const santriRows = allRows.filter((santri) => santri.isAktif);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-slate-900 p-6 text-white shadow-xl shadow-slate-200">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-300">
          Manajemen Kelas
        </p>
        <h2 className="mt-3 max-w-2xl text-4xl font-black leading-tight">
          Tempatkan santri ke dalam Program Peminatan.
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
          Gunakan fitur ini untuk menentukan kelas santri secara massal maupun individu. Santri yang sudah ditempatkan tidak perlu dipilih lagi kelasnya saat input nilai.
        </p>
      </section>

      <ManajemenKelasClient santriRows={santriRows} kelasList={kelasList} />
    </div>
  );
}
