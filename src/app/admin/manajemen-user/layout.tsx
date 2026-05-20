import { requirePermission } from "@/lib/permission";

export default async function ManajemenUserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission("manajemen_user");
  return <>{children}</>;
}
