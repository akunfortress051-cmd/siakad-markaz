import { getCertificateData, getDashboardSantriRows } from "@/lib/app-data";
import { getBaseUrl } from "@/lib/base-url";
import { getProgramLayout, getGlobalLayout, getMusyarokahLayout, getMartabahLayout } from "@/lib/syahadah-layout";
import { ProgramLayoutEditorClient } from "@/components/admin/program-layout-editor";
import { Metadata } from "next";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/permission";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Layout Editor Syahadah - Admin Panel",
};

export default async function ProgramLayoutEditorPage({
  params,
}: {
  params: Promise<{ programId: string }>;
}) {
  await requirePermission("layout_syahadah");
  const { programId } = await params;
  const isGlobal = programId === "global";

  let programName = "Template Global";
  let isTurats = false;
  if (!isGlobal) {
    const prog = await prisma.program.findUnique({ where: { id: programId } });
    if (!prog) notFound();
    programName = `Program ${prog.nama_indo}`;
    isTurats = (prog as any).kategori === "TURATS";
  }

  const baseUrl = await getBaseUrl();
  const layout = isGlobal ? await getGlobalLayout() : await getProgramLayout(programId);
  const musyarokahLayout = await getMusyarokahLayout(isGlobal ? null : programId);
  const martabahLayout = await getMartabahLayout(isTurats);
  
  // If editing global, pass null as programId to save function.
  const actualProgramId = isGlobal ? null : programId;

  // Find a sample santri to use as preview.
  const allRows = await getDashboardSantriRows();
  let sampleSantri = null;

  if (isGlobal) {
    // For global template, specifically use I'dad Awal as the preview sample
    sampleSantri = allRows.find((s: any) => 
      s.isAktif && 
      s.canPrintSyahadah && 
      s.programNama === "I'dad Awal"
    );
  } else {
    sampleSantri = allRows.find((s: any) => 
      s.isAktif && 
      s.canPrintSyahadah && 
      s.programId === programId
    );
  }

  const realTemplate = await prisma.syahadahTemplate.findFirst();

  let sampleData = null;
  let sampleQrUrl = "";

  if (sampleSantri) {
    sampleData = await getCertificateData(sampleSantri.id);
    if (sampleData && sampleData.masterSantri) {
      sampleData.masterSantri.nama = "Ahmad Ibnu Alwan"; // Override for preview
    }
    sampleQrUrl = `${baseUrl}/ijazah/${sampleSantri.id}`;
  }

  // Build a dummy preview if no santri available
  if (!sampleData) {
    // If we have a specific program, try to get its mapel for the dummy table
    let dummyMapel = [
      { mapelId: "1", nama_arab: "النحو", skor: 90 },
      { mapelId: "2", nama_arab: "الصرف", skor: 85 },
      { mapelId: "3", nama_arab: "المحادثة", skor: 88 },
    ];
    let progArabName = "برنامج التعليم";

    if (isGlobal) {
      const prog = await prisma.program.findFirst({
        where: { nama_indo: "I'dad Awal" },
        include: { programMapels: { include: { mapel: true }, orderBy: { urutan: "asc" } } }
      });
      if (prog) {
        progArabName = prog.nama_arab;
        if (prog.programMapels.length > 0) {
          dummyMapel = prog.programMapels.map(pm => ({
            mapelId: pm.mapelId,
            nama_arab: pm.mapel.nama_arab,
            skor: 90
          }));
        }
      }
    } else {
      const prog = await prisma.program.findUnique({
        where: { id: programId },
        include: { programMapels: { include: { mapel: true }, orderBy: { urutan: "asc" } } }
      });
      if (prog) {
        progArabName = prog.nama_arab;
        if (prog.programMapels.length > 0) {
          dummyMapel = prog.programMapels.map(pm => ({
            mapelId: pm.mapelId,
            nama_arab: pm.mapel.nama_arab,
            skor: 90
          }));
        }
      }
    }

    sampleData = {
      status: "LULUS",
      average: 85.5,
      averagePredikat: { indo: "Jayyid Jiddan", arab: "جيد جدا" },
      masterSantri: {
        nama: "Ahmad Ibnu Alwan",
        dufahNama: "Dufah 1",
      },
      program: {
        nama_arab: progArabName,
      },
      template: {
        tgl_cetak_arab: realTemplate?.tgl_cetak_arab || "١ يناير ٢٠٢٦",
        tgl_mulai_arab: realTemplate?.tgl_mulai_arab || "١ يناير ٢٠٢٦",
        tgl_selesai_arab: realTemplate?.tgl_selesai_arab || "١ فبراير ٢٠٢٦",
        jabatan_mudir_arab: realTemplate?.jabatan_mudir_arab || "مدير مركز العربية",
        nama_mudir_arab: realTemplate?.nama_mudir_arab || "اسم المدير",
        teks_dufah_akbarnas_arab: realTemplate?.teks_dufah_akbarnas_arab || "الدفعة الثامنة والثمنين إلى الدفعة التاسعة والثمنين",
        teks_dufah_arab: realTemplate?.teks_dufah_arab || "الدفعة التاسعة والثمنين",
      },
      nilaiRows: dummyMapel,
    };
    sampleQrUrl = `${baseUrl}/preview`;
  }

  // Build musyarokah sample data (clone and set status)
  const musyarokahSampleData = sampleData ? { ...sampleData, status: "MUSYAROKAH" } : null;
  const martabahSampleData = sampleData; // Martabah uses same data, but editor passes isMartabah=true

  return (
    <ProgramLayoutEditorClient
      initialLayout={layout}
      initialMusyarokahLayout={musyarokahLayout}
      initialMartabahLayout={martabahLayout}
      sampleData={sampleData}
      musyarokahSampleData={musyarokahSampleData}
      martabahSampleData={martabahSampleData}
      sampleQrUrl={sampleQrUrl}
      programId={actualProgramId}
      programName={programName}
      isTurats={isTurats}
    />
  );
}
