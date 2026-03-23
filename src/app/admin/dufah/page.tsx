import prisma from "@/lib/prisma";
import { DufahManager } from "@/components/admin/dufah-manager";
import { syncDufahTable, getActiveDufahName } from "@/lib/absensi";

export const dynamic = "force-dynamic";

export default async function DufahPage() {
  await syncDufahTable();
  const activeDufahName = await getActiveDufahName();

  const dufahList = await prisma.dufah.findMany({
    orderBy: { nama: "desc" },
    include: {
      _count: {
        select: { riwayatRecords: true }
      }
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Manajemen Angkatan (Duf'ah)</h1>
          <p className="text-sm text-slate-500 mt-1">Mengelola siklus waktu angkatan dan sistem Usbu'.</p>
        </div>
      </div>
      
      <DufahManager initialData={dufahList as any} activeDufahName={activeDufahName} />
    </div>
  );
}
