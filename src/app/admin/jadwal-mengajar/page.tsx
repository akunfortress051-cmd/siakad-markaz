import { Metadata } from "next";
import prisma from "@/lib/prisma";
import { JadwalMengajarClient } from "@/components/admin/jadwal-mengajar-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Jadwal Mengajar - Admin Panel",
};

export default async function JadwalMengajarPage() {
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

  const availableTeachers = await prisma.user.findMany({
    where: { 
      role: { in: ["PENGAJAR", "WALI_KELAS"] },
      isActive: true
    },
    orderBy: { nama: 'asc' },
    select: { id: true, nama: true, role: true }
  });

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black text-slate-900 md:text-4xl">
          Jadwal Mengajar
        </h1>
        <p className="text-base text-slate-500 max-w-2xl">
          Plotting pengajar dan wali kelas ke kelas berdasarkan hissoh/sesi mingguan.
        </p>
      </div>
      <JadwalMengajarClient 
        programs={programs} 
        initialPengajarSesi={pengajarSesi} 
        teachers={availableTeachers} 
      />
    </div>
  );
}
