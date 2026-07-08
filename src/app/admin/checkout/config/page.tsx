import { requirePermission } from "@/lib/permission";
import { Metadata } from "next";
import { CheckoutConfigClient } from "@/components/admin/checkout-config-client";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Konfigurasi Approver Check Out - Admin",
};

export default async function CheckoutConfigPage() {
  await requirePermission("checkout_config"); // Memastikan ada role "checkout_config" atau "admin"

  const configs = await prisma.checkoutApproverConfig.findMany({
    include: {
      user: { select: { nama: true, username: true } },
    },
    orderBy: [
      { kategori: "asc" },
      { urutan: "asc" }
    ]
  });

  const users = await prisma.user.findMany({
     where: { isActive: true },
     select: { id: true, nama: true, role: true },
     orderBy: { nama: "asc" }
  });

  return (
    <div className="space-y-6">
      <CheckoutConfigClient initialConfigs={configs} allUsers={users} />
    </div>
  );
}
