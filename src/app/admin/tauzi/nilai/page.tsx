import { getSession } from "@/lib/auth";
import InputNilaiTauziClient from "./client";
import { requirePermission } from "@/lib/permission";

export const dynamic = "force-dynamic";

export default async function TauziNilaiPage() {
  await requirePermission("tauzi_nilai");
  const session = await getSession();

  return <InputNilaiTauziClient userName={session?.nama || session?.username || ""} />;
}
