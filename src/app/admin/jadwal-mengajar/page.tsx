import { requirePermission } from "@/lib/permission";
import { Metadata } from "next";
import prisma from "@/lib/prisma";
import { JadwalMengajarClient } from "@/components/admin/jadwal-mengajar-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Jadwal Mengajar - Admin Panel",
};

export default async function JadwalMengajarPage() {
  await requirePermission("jadwal_mengajar");
  const programs = await prisma.program.findMany({
    include: {
      kelasList: {
        orderBy: { nama: 'asc' }
      }
    }
  });

  const pengajarSesi = await prisma.pengajarSesi.findMany({
    include: {
      user: {
        select: { id: true, nama: true, role: true }
      }
    }
  });

  const sesiTambahan = await prisma.sesiTambahanProgram.findMany({
    where: { isActive: true },
    select: { programId: true, sesi: true }
  });

  const pengajarSesiProgram = await prisma.pengajarSesiProgram.findMany({
    include: {
      user: { select: { id: true, nama: true, role: true } },
      program: { select: { id: true, nama_indo: true } }
    }
  });

  const plottingRolesPerm = await prisma.rolePermission.findMany({
    where: {
      permission: { in: ["absen_kelas", "manajemen_sesi", "rekap_kelas"] }
    },
    select: { role: true }
  });

  const plottingRoles = Array.from(new Set(["PENGAJAR", "WALI_KELAS", ...plottingRolesPerm.map(p => p.role)]));

  const availableTeachers = await prisma.user.findMany({
    where: { 
      role: { in: plottingRoles },
      isActive: true
    },
    orderBy: { nama: 'asc' },
    select: { id: true, nama: true, role: true }
  });

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black md:text-4xl ">
          Jadwal Mengajar
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] max-w-2xl">
          Plotting pengajar dan wali kelas ke kelas berdasarkan hissoh/sesi mingguan.
        </p>
      </div>
      <JadwalMengajarClient 
        programs={programs} 
        initialPengajarSesi={pengajarSesi} 
        teachers={availableTeachers} 
        sesiTambahan={sesiTambahan}
        initialPengajarSesiProgram={pengajarSesiProgram}
      />
    </div>
  );
}
