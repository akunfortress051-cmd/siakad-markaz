import { redirect } from "next/navigation";

export default async function LegacyInputPage({
  params,
}: {
  params: Promise<{ id_santri: string }>;
}) {
  const { id_santri } = await params;
  redirect(`/admin/input-nilai/${id_santri}`);
}
