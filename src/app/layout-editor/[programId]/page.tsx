import { getCertificateData, getDashboardSantriRows } from "@/lib/app-data";
import { getBaseUrl } from "@/lib/base-url";
import { getProgramLayout } from "@/lib/syahadah-layout";
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
  if (!isGlobal) {
    const prog = await prisma.program.findUnique({ where: { id: programId } });
    if (!prog) notFound();
    programName = `Program ${prog.nama_indo}`;
  }

  const baseUrl = await getBaseUrl();
  const layout = isGlobal ? await getProgramLayout("global") /* fallback string won't match any real ID so it returns global */ : await getProgramLayout(programId);
  
  // If editing global, pass null as programId to save function.
  const actualProgramId = isGlobal ? null : programId;

  // Find a sample santri to use as preview.
  // If it's a specific program, find a santri from that program.
  const allRows = await getDashboardSantriRows();
  const sampleSantri = allRows.find((s: any) => 
    s.isAktif && 
    s.canPrintSyahadah && 
    (isGlobal || s.programId === programId)
  );

  let sampleData = null;
  let sampleQrUrl = "";

  if (sampleSantri) {
    sampleData = await getCertificateData(sampleSantri.id);
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

    if (!isGlobal) {
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
        nama: "Ahmad Fauzan",
        dufahNama: "Dufah 1",
      },
      program: {
        nama_arab: progArabName,
      },
      template: {
        tgl_cetak_arab: "١ يناير ٢٠٢٦",
        tgl_mulai_arab: "١ يناير ٢٠٢٦",
        tgl_selesai_arab: "١ فبراير ٢٠٢٦",
        jabatan_mudir_arab: "مدير مركز العربية",
        nama_mudir_arab: "اسم المدير",
      },
      nilaiRows: dummyMapel,
    };
    sampleQrUrl = `${baseUrl}/preview`;
  }

  return (
    <ProgramLayoutEditorClient
      initialLayout={layout}
      sampleData={sampleData}
      sampleQrUrl={sampleQrUrl}
      programId={actualProgramId}
      programName={programName}
    />
  );
}
