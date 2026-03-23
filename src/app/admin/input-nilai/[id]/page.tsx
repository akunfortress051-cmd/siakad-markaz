import { InputNilaiForm } from "@/components/admin/input-nilai-form";
import { getSantriFormData } from "@/lib/app-data";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function InputNilaiPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getSantriFormData(id);

  if (!data) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-700">
            Input Nilai
          </p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">Penilaian santri per kelas dan mapel</h2>
        </div>
        <Link
          href="/admin/syahadah"
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          Kembali ke Data Syahadah
        </Link>
      </div>

      <InputNilaiForm
        santri={data.masterSantri}
        currentUsbu={data.currentUsbu}
        programList={data.programList}
        internalSantri={data.internalSantri} 
        activeRiwayat={data.activeRiwayat} 
      />
    </div>
  );
}
