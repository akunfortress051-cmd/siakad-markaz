import { requirePermission } from "@/lib/permission";
import { ThalibMitsaliClient } from "@/components/admin/thalib-mitsali-client";

export default async function ThalibMitsaliPage() {
  await requirePermission("cetak_nilai_pekanan");

  return <ThalibMitsaliClient />;
}
