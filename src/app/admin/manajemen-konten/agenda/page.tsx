import { requirePermission } from "@/lib/permission";
import prisma from "@/lib/prisma";
import { AgendaClient } from "@/components/admin/agenda-client";

export const dynamic = "force-dynamic";

export default async function AgendaPage() {
  await requirePermission("manajemen_dufah");
  const agendas = await prisma.agenda.findMany({
    orderBy: { waktuMulai: "desc" }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Agenda Rutinan</h1>
        <p className="text-sm text-slate-500">Kelola jadwal kegiatan dan agenda berulang.</p>
      </div>

      <AgendaClient initialData={agendas} />
    </div>
  );
}
