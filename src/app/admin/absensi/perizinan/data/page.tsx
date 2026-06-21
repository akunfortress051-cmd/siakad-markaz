import { Metadata } from "next";
import prisma from "@/lib/prisma";
import PerizinanDataClient from "@/components/admin/perizinan-data-client";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Data Santri Izin - Admin Panel",
};

export default async function DataPerizinanPage() {
  const session = await getSession();
  
  const rolePerm = session?.role === "ADMIN" ? [{ permission: "*" }] : await prisma.rolePermission.findMany({
    where: { role: session?.role as any },
    select: { permission: true }
  });

  const permissions = rolePerm.map(p => p.permission);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">
          Data Santri Izin
        </h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Daftar santri yang sedang atau pernah mengajukan izin.
        </p>
      </div>

      <PerizinanDataClient permissions={permissions} />
    </div>
  );
}
