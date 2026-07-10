import { getSession } from "@/lib/auth";
import { checkPermission } from "@/lib/permission";
import HasilTauziClient from "./client";

export const dynamic = "force-dynamic";

export default async function HasilTauziPage() {
  const session = await getSession();
  const hasEditAccess = await checkPermission("tauzi_hasil_edit");

  return <HasilTauziClient hasEditAccess={hasEditAccess} />;
}
