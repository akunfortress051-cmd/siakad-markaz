import { requirePermission } from "@/lib/permission";
import { Metadata } from "next";
import { CheckoutClient } from "@/components/admin/checkout-client";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pengajuan Check Out - Admin",
};

export default async function CheckoutAdminPage() {
  await requirePermission("checkout_pengajuan");
  const session = await getSession();

  return (
    <div className="space-y-6">
      <CheckoutClient currentUser={session} />
    </div>
  );
}
