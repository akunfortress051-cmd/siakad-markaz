import { Metadata } from "next";
import { getProgramCatalog } from "@/lib/app-data";
import { AbsensiKelasClient } from "@/components/admin/absensi-kelas-client";

import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permission";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Absen Kelas - Admin Panel",
};

export default async function AbsensiKelasPage() {
  await requirePermission("absen_kelas");
  const session = await getSession();
  const programList = await getProgramCatalog();
  
  let allowedClassIds: string[] | null = null; // null = all classes allowed
  let teacherSessions: { sesi: string, kelasId: string }[] = [];
  
  if (session) {
    if (session.role !== "ADMIN") {
      const ps = await prisma.pengajarSesi.findMany({
        where: { userId: session.userId },
        select: { kelasId: true, sesi: true }
      });
      
      // Jika user punya jadwal ngajar ATAU punya kelasId (Wali Kelas), batasi aksesnya
      // Jika tidak punya keduanya (misal KSU/Staff pemantau), biarkan allowedClassIds = null (akses semua)
      if (ps.length > 0 || session.kelasId) {
        allowedClassIds = Array.from(new Set(ps.map(p => p.kelasId)));
        
        if (session.kelasId && !allowedClassIds.includes(session.kelasId)) {
          allowedClassIds.push(session.kelasId);
        }
        
        teacherSessions = ps.map(p => ({ sesi: p.sesi, kelasId: p.kelasId }));
      }
    }
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black text-slate-900 md:text-4xl">
          Absen Kelas
        </h1>
        <p className="text-base text-slate-500 max-w-2xl">
          Pendataan kehadiran santri di kelas berdasarkan hissoh (sesi).
        </p>
      </div>
      <AbsensiKelasClient 
        programList={programList} 
        allowedClassIds={allowedClassIds} 
        userRole={session?.role}
        teacherSessions={teacherSessions}
      />
    </div>
  );
}
