import { requirePermission } from "@/lib/permission";
import { getDashboardSantriRows, getProgramCatalog } from "@/lib/app-data";
import { DashboardCharts } from "@/components/admin/dashboard-charts";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard Grafik - Admin Panel",
};

export default async function DashboardPage() {
  await requirePermission("dashboard");
  const [santriRows, programList] = await Promise.all([
    getDashboardSantriRows(),
    getProgramCatalog(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black text-slate-900 md:text-4xl">
          Dashboard Utama
        </h1>
        <p className="text-base text-slate-500 max-w-2xl">
          Visualisasi ringkas dari distribusi data santri Markaz Arabiyah berdasarkan kelas utama dan rombongan belajar (ruangan).
        </p>
      </div>

      <DashboardCharts santriRows={santriRows} programList={programList} />
    </div>
  );
}
