import { requirePermission } from "@/lib/permission";

export default async function JadwalSesiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission("manajemen_sesi");
  return <>{children}</>;
}
