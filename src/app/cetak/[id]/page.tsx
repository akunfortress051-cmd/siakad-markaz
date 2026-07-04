import { getCertificateData } from "@/lib/app-data";
import { getBaseUrl } from "@/lib/base-url";
import { notFound } from "next/navigation";
import { SyahadahEditor } from "@/components/syahadah-editor";
import { getLayoutForRiwayat, getProgramLayout, getGlobalLayout, getMusyarokahLayout, getMusyarokahLayoutForRiwayat } from "@/lib/syahadah-layout";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CetakPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getCertificateData(id);

  if (!data) {
    notFound();
  }

  if (data.status === "TIDAK_LULUS") {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-10">
        <div className="mx-auto max-w-2xl rounded-[2rem] border border-rose-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-rose-600">Syahadah Terkunci</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">Cetak Syahadah belum tersedia</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Status santri masih TIDAK_LULUS karena Tasmi&apos;. Silakan lengkapi data di halaman input nilai terlebih dahulu.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/admin/dashboard"
              className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Kembali ke Dashboard
            </Link>
            <Link
              href={`/admin/input-nilai/${id}`}
              className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Lengkapi Nilai
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const baseUrl = await getBaseUrl();
  const qrUrl = `${baseUrl}/ijazah/${id}`;

  const riwayatId = data.riwayatSantri?.id ?? null;
  const programId = data.program?.id ?? null;
  const isTurats = (data.program as any)?.kategori === "TURATS";

  // Fetch layout: per-santri override → per-program → global → default
  // Use musyarokah-specific layout if status is MUSYAROKAH
  let layout;
  const isMusyarokah = data.status === "MUSYAROKAH";
  
  if (isMusyarokah) {
    if (riwayatId && programId) {
      layout = await getMusyarokahLayoutForRiwayat(riwayatId, programId);
    } else {
      layout = await getMusyarokahLayout(programId);
    }
  } else {
    if (riwayatId && programId) {
      layout = await getLayoutForRiwayat(riwayatId, programId);
    } else if (programId) {
      layout = await getProgramLayout(programId);
    } else {
      layout = await getGlobalLayout();
    }
  }

  return (
    <SyahadahEditor
      qrUrl={qrUrl}
      data={data as any}
      initialLayout={layout}
      riwayatId={riwayatId}
      programId={programId}
      mode="per-santri"
      musyarokah={isMusyarokah}
      backHref="/admin/dashboard"
      backLabel="← Kembali ke Dashboard"
      isTurats={isTurats}
    />
  );
}
