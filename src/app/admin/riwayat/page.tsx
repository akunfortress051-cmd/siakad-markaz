import { getRiwayatSantriRows } from "@/lib/app-data";
import { RiwayatClient } from "@/components/admin/riwayat-client";
import { Metadata } from "next";
import { requirePermission } from "@/lib/permission";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Riwayat Santri - Admin Panel",
};

export default async function RiwayatPage() {
  await requirePermission("syahadah");
  const santriGroups = await getRiwayatSantriRows();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black text-slate-900 md:text-4xl">
          Riwayat Santri
        </h1>
        <p className="text-base text-slate-500 max-w-2xl">
          Arsip data santri tidak aktif terdahulu. Anda masih bisa melihat nilai dan mencetak syahadah (sertifikat) mereka.
        </p>
      </div>

      <RiwayatClient santriGroups={santriGroups} />
    </div>
  );
}
