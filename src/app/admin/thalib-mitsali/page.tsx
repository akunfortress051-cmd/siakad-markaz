import { requirePermission } from "@/lib/permission";
import { ThalibMitsaliClient } from "@/components/admin/thalib-mitsali-client";

export default async function ThalibMitsaliPage() {
  await requirePermission("thalib_mitsali");

  return <ThalibMitsaliClient />;
}
