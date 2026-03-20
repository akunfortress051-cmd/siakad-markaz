import { getProgramCatalog } from "@/lib/app-data";
import { AbsensiKelasClient } from "@/components/admin/absensi-kelas-client";

export default async function AbsensiKelasPage() {
  const programList = await getProgramCatalog();

  return <AbsensiKelasClient programList={programList} />;
}
