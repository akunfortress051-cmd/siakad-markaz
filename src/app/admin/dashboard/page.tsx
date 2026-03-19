import { getDashboardSantriRows, getKelasCatalog } from "@/lib/app-data";
import { DashboardClient } from "@/components/admin/dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const allRows = await getDashboardSantriRows();
  const santriRows = allRows.filter((santri) => santri.isAktif);
  const kelasList = await getKelasCatalog();

  return <DashboardClient santriRows={santriRows} kelasList={kelasList} />;
}

