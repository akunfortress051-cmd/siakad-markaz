import { getProgramCatalog } from "@/lib/app-data";
import { AbsensiSakanClient } from "@/components/admin/absensi-sakan-client";

export default async function AbsensiSakanPage() {
  const programList = await getProgramCatalog();

  return <AbsensiSakanClient programList={programList} />;
}
