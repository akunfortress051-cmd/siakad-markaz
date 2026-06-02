import { requirePermission } from "@/lib/permission";
import { getDashboardSantriRows } from "@/lib/app-data";
import { getActiveDufahName } from "@/lib/absensi";
import prisma from "@/lib/prisma";
import { HaflahWadaClient } from "@/components/admin/haflah-wada-client";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Haflah Wada' - Admin Panel",
};

export default async function HaflahWadaPage() {
  await requirePermission("data_syahadah");

  const [santriRows, kelasList, activeDufahName] = await Promise.all([
    getDashboardSantriRows(),
    prisma.kelas.findMany({
      include: {
        waliKelas: true,
      }
    }),
    getActiveDufahName()
  ]);

  const dufahLabel = activeDufahName ?? "Aktif";

  // Filter completed santri only (and not TIDAK_LULUS)
  const eligibleRows = santriRows.filter((santri: any) => 
    santri.isAktif && santri.canViewIjazah && santri.statusKelulusan !== "TIDAK_LULUS"
  );

  return (
    <div className="space-y-6 print:space-y-0">
      <div className="flex flex-col gap-2 print:hidden">
        <h1 className="text-3xl font-black text-slate-900 md:text-4xl">
          Haflah Wada'
        </h1>
        <p className="text-base text-slate-500 max-w-2xl">
          Manajemen denah tempat duduk dan urutan pemanggilan santri pada acara Haflah Wada'.
        </p>
      </div>

      <HaflahWadaClient 
        santriRows={eligibleRows} 
        kelasList={kelasList}
        dufahLabel={dufahLabel}
      />
    </div>
  );
}
