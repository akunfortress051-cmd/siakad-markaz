import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { CetakUsbuSelector } from "@/components/admin/cetak-usbu-selector";
import { requirePermission } from "@/lib/permission";

export default async function CetakUsbuPage() {
  await requirePermission("syahadah");
  const kelasList = await prisma.kelas.findMany({
    include: {
      program: true,
    },
    orderBy: [
      { program: { nama_indo: "asc" } },
      { nama: "asc" },
    ]
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Cetak Rapor Usbu'</h1>
          <p className="mt-2 text-slate-600">
            Pilih kelas dan fase Usbu' untuk mencetak Daftar Nilai Ujian Akhir Pekan.
          </p>
        </div>
      </div>

      <div className="rounded-[2.5rem] bg-white p-8 shadow-sm border border-slate-200/60 w-full max-w-2xl">
        <CetakUsbuSelector kelasList={kelasList.map(k => ({ id: k.id, nama: k.nama, programNama: k.program.nama_indo }))} />
      </div>
    </div>
  );
}
