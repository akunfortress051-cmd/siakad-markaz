import { Metadata } from "next";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Clock, Calendar, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Jadwal Saya - Admin Panel",
};

export default async function JadwalSayaPage() {
  const session = await getSession();
  
  if (!session || (session.role !== "PENGAJAR" && session.role !== "WALI_KELAS")) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-slate-700">Akses Ditolak</h1>
        <p className="text-slate-500 mt-2">Anda tidak memiliki akses ke halaman ini. Halaman ini khusus untuk pengajar.</p>
      </div>
    );
  }

  // Ambil data jadwal sesi yang aktif
  const jadwalSesiList = await prisma.jadwalSesi.findMany({
    where: { isActive: true },
    orderBy: { sesi: 'asc' }
  });

  // Ambil plot jadwal pengajar saat ini
  const pengajarSesi = await prisma.pengajarSesi.findMany({
    where: { userId: session.userId },
    include: { kelas: true }
  });

  // Susun data per sesi
  const jadwalMerged = jadwalSesiList.map(jadwal => {
    const teachingThisSession = pengajarSesi.find(p => p.sesi === jadwal.sesi);
    return {
      sesi: jadwal.sesi,
      label: jadwal.label,
      jamBuka: jadwal.jamBuka,
      jamTutup: jadwal.jamTutup,
      toleransi: jadwal.toleransiMenit,
      kelas: teachingThisSession ? teachingThisSession.kelas.nama : null
    };
  });

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black text-slate-900 md:text-4xl flex items-center gap-3">
          <Calendar className="h-8 w-8 text-emerald-600" />
          Jadwal Mengajar Saya
        </h1>
        <p className="text-base text-slate-500 max-w-2xl">
          Berikut adalah jadwal kelas yang harus Anda ajar berdasarkan pengaturan sesi dari bagian Kurikulum.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {jadwalMerged.map((jadwal) => (
          <div key={jadwal.sesi} className={`rounded-3xl border p-6 md:p-8 transition-all shadow-sm flex flex-col justify-between ${jadwal.kelas ? 'bg-emerald-50/70 border-emerald-200' : 'bg-white border-slate-200 opacity-80'}`}>
             <div>
               <div className="flex justify-between items-start mb-6">
                 <div>
                   <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-lg ${jadwal.kelas ? 'bg-emerald-200/50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                     {jadwal.sesi.replace('_', ' ')}
                   </span>
                   <h3 className="text-xl font-black text-slate-800 mt-4">{jadwal.label}</h3>
                 </div>
                 {jadwal.kelas && (
                   <CheckCircle2 className="text-emerald-500 w-8 h-8" />
                 )}
               </div>
               
               <div className="flex items-center gap-2 text-slate-600 font-mono text-sm font-bold bg-white/60 w-max px-3 py-1.5 rounded-lg border border-slate-200/50 mb-6">
                  <Clock className="w-4 h-4 text-slate-400" />
                  {jadwal.jamBuka} - {jadwal.jamTutup}
               </div>
             </div>
             
             <div className="pt-5 border-t border-slate-200/50">
               {jadwal.kelas ? (
                 <div>
                   <p className="text-[11px] uppercase tracking-[0.2em] font-black text-emerald-600 mb-1.5">Mengajar Kelas</p>
                   <p className="text-2xl font-black text-slate-800">{jadwal.kelas}</p>
                 </div>
               ) : (
                 <div>
                   <p className="text-[11px] uppercase tracking-[0.2em] font-black text-slate-400 mb-1.5">Status</p>
                   <p className="text-lg font-bold text-slate-500">Kosong (Tidak Ada Jadwal)</p>
                 </div>
               )}
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
