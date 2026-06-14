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
  
  // Optimasi: Jalankan fetch session dan programList secara paralel (mempercepat ~30-50%)
  const [session, programList] = await Promise.all([
    getSession(),
    getProgramCatalog()
  ]);
  
  let allowedClassIds: string[] | null = null; // null = all classes allowed
  let teacherSessions: { sesi: string, kelasId: string, isProgramLevel?: boolean, programId?: string, programNama?: string }[] = [];
  let allPengajarSesi: any[] = []; // Untuk Admin Backup Mode
  
  // Ambil data Taqwim hari ini
  const { getTodayWibString, parseWibDateString } = await import("@/lib/absensi");
  const todayWib = parseWibDateString(getTodayWibString());
  const taqwimToday = await prisma.tanggalTaqwim.findMany({
    where: { tanggal: todayWib },
    select: { programId: true }
  });
  const taqwimProgramIds = taqwimToday.map((t: any) => t.programId);
  
  if (session) {
    if (session.role !== "ADMIN") {
      const ps = await prisma.pengajarSesi.findMany({
        where: { userId: session.userId },
        select: { kelasId: true, sesi: true }
      });
      
      const psp = await prisma.pengajarSesiProgram.findMany({
        where: { userId: session.userId },
        include: { program: { include: { kelasList: { select: { id: true } } } } }
      });
      
      if (ps.length > 0 || session.kelasId || psp.length > 0) {
        allowedClassIds = Array.from(new Set(ps.map(p => p.kelasId)));
        
        if (session.kelasId && !allowedClassIds!.includes(session.kelasId)) {
          allowedClassIds!.push(session.kelasId);
        }
        
        psp.forEach((p: any) => {
          // Add all classes in the program
          p.program.kelasList.forEach((k: any) => {
            if (!allowedClassIds!.includes(k.id)) {
              allowedClassIds!.push(k.id);
            }
          });
        });
        
        teacherSessions = ps.map(p => ({ sesi: p.sesi, kelasId: p.kelasId }));
        psp.forEach((p: any) => {
          teacherSessions.push({
            sesi: p.sesi,
            kelasId: `PROGRAM_${p.programId}`,
            isProgramLevel: true,
            programId: p.programId,
            programNama: p.program.nama_indo
          });
        });
        
        // Logika Override Taqwim
        if (taqwimProgramIds.length > 0) {
          // Cari programId dari kelas-kelas yang ada di teacherSessions dan wali kelas
          for (const prog of programList) {
            if (taqwimProgramIds.includes(prog.id)) {
              const kelasIdsInProgram = prog.kelasList.map((k:any) => k.id);
              
              // 1. Hapus jadwal SESI_1 pengajar biasa di program ini
              teacherSessions = teacherSessions.filter(ts => {
                if (ts.sesi === "SESI_1" && kelasIdsInProgram.includes(ts.kelasId)) {
                  // Jika dia BUKAN wali kelas dari kelas ini, hapus
                  if (session.kelasId !== ts.kelasId) return false;
                }
                return true;
              });
              
              // 2. Tambahkan SESI_1 untuk Wali Kelas jika kelasnya ada di program ini
              if (session.kelasId && kelasIdsInProgram.includes(session.kelasId)) {
                if (!teacherSessions.some(ts => ts.sesi === "SESI_1" && ts.kelasId === session.kelasId)) {
                  teacherSessions.push({ sesi: "SESI_1", kelasId: session.kelasId });
                }
              }
            }
          }
        }

      } else {
        allowedClassIds = [];
      }
    } else {
      allPengajarSesi = await prisma.pengajarSesi.findMany({
        select: {
          sesi: true,
          kelasId: true,
          user: {
            select: { id: true, nama: true }
          }
        }
      });
      
      // Admin backup mode juga harus merefleksikan Taqwim
      if (taqwimProgramIds.length > 0) {
        for (const prog of programList) {
          if (taqwimProgramIds.includes(prog.id)) {
            const kelasIdsInProgram = prog.kelasList.map((k:any) => k.id);
            allPengajarSesi = allPengajarSesi.filter(ps => !(ps.sesi === "SESI_1" && kelasIdsInProgram.includes(ps.kelasId)));
          }
        }
      }
    }
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black md:text-4xl ">
          Absen Kelas
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] max-w-2xl">
          Pendataan kehadiran santri di kelas berdasarkan hissoh (sesi).
        </p>
      </div>
      <AbsensiKelasClient 
        programList={programList} 
        allowedClassIds={allowedClassIds} 
        userRole={session?.role}
        teacherSessions={teacherSessions}
        allPengajarSesi={allPengajarSesi}
      />
    </div>
  );
}
