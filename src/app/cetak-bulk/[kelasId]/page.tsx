import { SyahadahDocument } from "@/components/syahadah-document";
import { SyahadahTuratsDocument } from "@/components/syahadah-turats-document";
import { PrintToolbar } from "@/components/print-toolbar";
import { getBaseUrl } from "@/lib/base-url";
import { getDashboardSantriRows, getCertificateData } from "@/lib/app-data";
import { getLayoutForRiwayat, getProgramLayout, getGlobalLayout } from "@/lib/syahadah-layout";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CetakBulkPage({
  params,
}: {
  params: Promise<{ kelasId: string }>;
}) {
  const { kelasId } = await params;
  const baseUrl = await getBaseUrl();
  const allSantri = await getDashboardSantriRows();

  // "kelasId" in the URL actually receives kelasId now from Dashboard
  const eligibleSantris = allSantri.filter(
    (s) => s.isAktif && s.canPrintSyahadah && s.kelasId === kelasId
  );

  if (eligibleSantris.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-slate-800">Tidak ada santri</h1>
          <p className="mt-2 text-slate-600">Tidak ada santri yang memiliki status LULUS atau MUSYAROKAH di kelas ini.</p>
        </div>
      </div>
    );
  }

  // Fetch global layout as fallback
  const globalLayout = await getGlobalLayout();

  // Pre-fetch layouts for known programs to avoid N+1 queries
  const programLayouts = new Map<string, any>();
  const uniquePrograms = Array.from(new Set(eligibleSantris.map(s => s.programId).filter(Boolean)));
  for (const pid of uniquePrograms) {
    if (pid) {
      programLayouts.set(pid, await getProgramLayout(pid));
    }
  }

  // Fetch all certificate data + layouts in parallel for eligible santris
  const certificateDataList = await Promise.all(
    eligibleSantris.map(async (santri) => {
      const data = await getCertificateData(santri.id);
      
      const programId = data?.program?.id;
      const isMusyarokah = data?.status === "MUSYAROKAH";
      
      let layout = globalLayout;
      
      if (isMusyarokah) {
        // Use musyarokah-specific layout
        const { getMusyarokahLayout, getMusyarokahLayoutForRiwayat } = await import("@/lib/syahadah-layout");
        if (data?.riwayatSantri?.id && programId) {
          layout = await getMusyarokahLayoutForRiwayat(data.riwayatSantri.id, programId);
        } else if (programId) {
          layout = await getMusyarokahLayout(programId);
        } else {
          layout = await getMusyarokahLayout(null);
        }
      } else {
        // Try per-program layout
        if (programId && programLayouts.has(programId)) {
          layout = programLayouts.get(programId);
        }
        
        // Try per-santri layout override
        if (data?.riwayatSantri?.id && programId) {
          layout = await getLayoutForRiwayat(data.riwayatSantri.id, programId);
        }
      }
      
      return { id: santri.id, data, layout };
    })
  );

  return (
    <>
      <style>{`
        html, body { margin: 0; padding: 0; background: #94a3b8; }
        @media print {
          html, body { background: white !important; margin: 0 !important; padding: 0 !important; }
          @page { size: 330mm 215mm; landscape; margin: 0; }
        }
      `}</style>

      <div className="min-h-screen bg-slate-300 px-4 py-8 print:bg-white print:p-0">
        {/* We place PrintToolbar so it doesn't print, and back to Dashboard */}
        <PrintToolbar backHref="/admin/syahadah" backLabel="Kembali ke Data Syahadah" />

        <div className="flex flex-col items-center gap-10 print:gap-0">
          {certificateDataList.map(({ id, data, layout }) => {
            if (!data) return null;
            const qrUrl = `${baseUrl}/ijazah/${id}`;
            const isTurats = (data.program as any)?.kategori === "TURATS";
            if (isTurats) {
              return <SyahadahTuratsDocument key={id} qrUrl={qrUrl} data={data as any} layout={layout} />;
            }
            return <SyahadahDocument key={id} qrUrl={qrUrl} data={data as any} layout={layout} />;
          })}
        </div>
      </div>
    </>
  );
}
