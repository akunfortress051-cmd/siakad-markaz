import { Metadata } from "next";
import { getProgramCatalog } from "@/lib/app-data";
import { AbsensiKelasClient } from "@/components/admin/absensi-kelas-client";

import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Absen Kelas - Admin Panel",
};

export default async function AbsensiKelasPage() {
  const session = await getSession();
  const programList = await getProgramCatalog();
  
  let allowedClassIds: string[] | null = null; // null = all classes allowed
  let teacherSessions: { sesi: string, kelasId: string }[] = [];
  
  if (session) {
    if (session.role === "WALI_KELAS" || session.role === "PENGAJAR") {
      const ps = await prisma.pengajarSesi.findMany({
        where: { userId: session.userId },
        select: { kelasId: true, sesi: true }
      });
      // Ambil ID kelas unik
      allowedClassIds = Array.from(new Set(ps.map(p => p.kelasId)));
      
      // Jika WALI_KELAS belum diplotting, defaultkan ke kelas yang dia wali-kan untuk semua sesi? 
      // Atau biarkan saja, jika dia belum diplotting dia tidak ada jadwal.
      // Tambahkan kelas utama WALI_KELAS jika ada, jaga-jaga.
      if (session.role === "WALI_KELAS" && session.kelasId && !allowedClassIds.includes(session.kelasId)) {
        allowedClassIds.push(session.kelasId);
      }
      
      teacherSessions = ps.map(p => ({ sesi: p.sesi, kelasId: p.kelasId }));
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
