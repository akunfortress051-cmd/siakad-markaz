import { SyahadahOnlineClient } from "@/components/admin/syahadah-online-client";
import { Metadata } from "next";
import { requirePermission } from "@/lib/permission";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Syahadah Online - Admin Panel",
};

export default async function SyahadahOnlinePage() {
  await requirePermission("syahadah_online");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black md:text-4xl">
          Syahadah Online
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] max-w-2xl">
          Kelola syahadah (sertifikat) untuk program online. Tambah data peserta, atur program, dan cetak syahadah.
        </p>
      </div>

      <SyahadahOnlineClient />
    </div>
  );
}
