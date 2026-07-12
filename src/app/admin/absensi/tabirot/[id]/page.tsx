import { requirePermission, checkPermission } from "@/lib/permission";
import { Metadata } from "next";
import { TabirotDetailClient } from "@/components/admin/tabirot-detail-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Detail Kelompok Ta'birot - Admin Panel",
};

export default async function TabirotDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission("absen_tabirot");
  const canEdit = await checkPermission("absen_tabirot_edit");

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header handled inside Client Component directly for better data sync */}
      <TabirotDetailClient kelompokId={id} canEdit={canEdit} />
    </div>
  );
}
