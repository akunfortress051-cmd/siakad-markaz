import { MasterDataForm } from "@/components/admin/master-data-form";
import { ProgramMapelManager } from "@/components/admin/program-mapel-manager";
import { getProgramCatalog, getTemplateData } from "@/lib/app-data";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/permission";

export const dynamic = "force-dynamic";

export default async function MasterDataPage() {
  await requirePermission("syahadah");
  const [programList, template, programsWithCount] = await Promise.all([
    getProgramCatalog(),
    getTemplateData(),
    prisma.program.findMany({
      include: {
        programMapels: {
          include: { mapel: true },
          orderBy: { urutan: "asc" },
        },
        _count: { select: { riwayatRecords: true } },
      },
      orderBy: { nama_indo: "asc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <MasterDataForm programList={programList} template={template} />

      {/* Section: Manajemen Program & Mapel */}
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-700">
            Manajemen Program & Mapel
          </p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">
            Struktur program dan mata pelajaran
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Tambah, hapus, atau atur ulang urutan mapel per program. Drag handle untuk mengubah urutan.
            Nilai yang sudah tersimpan tetap aman meski mapel dihapus.
          </p>
        </div>
        <ProgramMapelManager initialPrograms={programsWithCount as any} />
      </section>
    </div>
  );
}
