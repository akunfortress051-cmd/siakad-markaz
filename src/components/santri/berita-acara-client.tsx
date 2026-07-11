"use client";

import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { CheckCircle, XCircle, Clock, User, ClipboardList, PenLine, FileText } from "lucide-react";
import toast from "react-hot-toast";

type AbsenPengajar = {
  id: string;
  tanggal: string;
  sesi: string;
  waktuMulai: string;
  waktuSelesai: string;
  materi: string;
  terlambatMenit: number | null;
  user: { nama: string };
  beritaAcara: { id: string, konfirmasiHadir: boolean, catatan: string | null } | null;
};

type GroupedAbsen = {
  tanggal: string;
  records: AbsenPengajar[];
};

export function BeritaAcaraClient() {
  const [dataList, setDataList] = useState<AbsenPengajar[]>([]);
  const [kelasName, setKelasName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/santri/me/berita-acara");
      if (!res.ok) {
        if (res.status === 403) {
           toast.error("Anda bukan ketua kelas aktif.");
        }
        return;
      }
      
      const json = await res.json();
      if (json.success) {
        setDataList(json.data.absenList);
        setKelasName(json.data.kelas);
      }
    } catch (error) {
      console.error(error);
      toast.error("Gagal mengambil data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (absenId: string, konfirmasiHadir: boolean, catatan: string) => {
    setSubmittingId(absenId);
    try {
      const res = await fetch("/api/santri/me/berita-acara", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          absenPengajarId: absenId,
          konfirmasiHadir,
          catatan: catatan || null
        })
      });

      const json = await res.json();
      if (json.success) {
        toast.success("Berita Acara berhasil disimpan");
        // Update local state
        setDataList(prev => prev.map(item => {
          if (item.id === absenId) {
            return {
              ...item,
              beritaAcara: {
                id: json.data.id || "new",
                konfirmasiHadir,
                catatan
              }
            };
          }
          return item;
        }));
      } else {
        toast.error(json.error || "Gagal menyimpan");
      }
    } catch (err) {
      toast.error("Terjadi kesalahan jaringan");
    } finally {
      setSubmittingId(null);
    }
  };

  // Group by date
  const groupedList = dataList.reduce((acc, curr) => {
    const tgl = String(curr.tanggal).split('T')[0];
    const group = acc.find(g => g.tanggal === tgl);
    if (group) {
        group.records.push(curr);
    } else {
        acc.push({ tanggal: tgl, records: [curr] });
    }
    return acc;
  }, [] as GroupedAbsen[]);

  // Sort sessions within each day
  groupedList.forEach(g => {
    g.records.sort((a, b) => {
       const aSesi = parseInt(a.sesi.replace("SESI_", "")) || 0;
       const bSesi = parseInt(b.sesi.replace("SESI_", "")) || 0;
       return aSesi - bSesi;
    });
  });

  return (
    <div className="space-y-6">
      
      <div className="bg-white rounded-3xl p-6 border border-[var(--color-surface-dark)] shadow-sm text-center lg:text-left flex flex-col lg:flex-row items-center justify-between gap-4">
        <div>
           <h2 className="text-xl font-bold text-[var(--color-primary)] flex items-center justify-center lg:justify-start gap-2">
             <ClipboardList size={22} />
             Berita Acara Kelas {kelasName}
           </h2>
           <p className="text-sm text-[var(--color-text-muted)] mt-1 max-w-md">
             Konfirmasi kehadiran pengajar di kelas Anda. Rekaman absensi 7 hari terakhir.
           </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
           <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600"></div>
        </div>
      ) : groupedList.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-center bg-white rounded-3xl border border-[var(--color-surface-dark)] shadow-sm">
          <FileText className="h-12 w-12 text-[var(--color-text-subtle)] mb-4" />
          <p className="text-base font-bold text-[var(--color-text)]">Belum ada kelas</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-2 max-w-sm">
            Guru belum melengkapi absensi di kelas Anda. Berita acara baru akan muncul setelah guru absen.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
           {groupedList.map((group, gIdx) => (
             <div key={gIdx} className="space-y-4">
                <div className="flex items-center gap-2 px-2 sticky top-[60px] z-10 py-2 backdrop-blur-md bg-[var(--bg-app)]/80">
                   <div className="h-2 w-2 rounded-full bg-[var(--color-primary)]"></div>
                   <h3 className="font-bold text-[var(--color-text)]">
                     {format(new Date(group.tanggal), "EEEE, dd MMMM yyyy", { locale: id })}
                   </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {group.records.map((absen) => {
                      const ba = absen.beritaAcara;
                      const isComplete = ba !== null;
                      
                      return (
                         <BeritaAcaraCard 
                            key={absen.id} 
                            absen={absen} 
                            isComplete={isComplete} 
                            ba={ba} 
                            onSubmit={handleSubmit}
                            isSubmitting={submittingId === absen.id} 
                         />
                      )
                   })}
                </div>
             </div>
           ))}
        </div>
      )}

    </div>
  );
}

function BeritaAcaraCard({ absen, isComplete, ba, onSubmit, isSubmitting }: { 
   absen: AbsenPengajar, 
   isComplete: boolean, 
   ba: { konfirmasiHadir: boolean, catatan: string | null } | null,
   onSubmit: (id: string, hadir: boolean, catatan: string) => void,
   isSubmitting: boolean
}) {
   const [konfirmasi, setKonfirmasi] = useState<boolean | null>(ba ? ba.konfirmasiHadir : null);
   const [catatan, setCatatan] = useState<string>(ba?.catatan || "");
   const [isEditing, setIsEditing] = useState<boolean>(!isComplete);

   const sesiLabel = absen.sesi.replace('_', ' ');

   const save = () => {
      if (konfirmasi === null) {
         toast.error("Pilih status kehadiran terlebih dahulu");
         return;
      }
      onSubmit(absen.id, konfirmasi, catatan);
      setIsEditing(false);
   };

   return (
      <div className={`bg-white rounded-2xl p-5 border transition-all ${isComplete ? (ba?.konfirmasiHadir ? 'border-emerald-200 shadow-sm' : 'border-red-200 shadow-sm') : 'border-amber-200 shadow-[0_4px_12px_rgba(251,191,36,0.15)] ring-1 ring-amber-100'} flex flex-col`}>
         
         <div className="flex justify-between items-start mb-3">
            <div className="flex flex-col gap-1">
               <span className="inline-flex max-w-max items-center rounded-lg bg-[var(--color-surface)] px-2.5 py-1 text-xs font-bold text-[var(--color-text-muted)] tracking-wider">
                  {sesiLabel}
               </span>
               <h4 className="font-bold text-base text-[var(--color-text)] leading-tight">{absen.user.nama}</h4>
               
               <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                 <div className="flex items-center gap-1 text-[var(--color-text-subtle)] text-xs font-medium">
                    <Clock size={12} />
                    {absen.waktuMulai} - {absen.waktuSelesai}
                 </div>
                 {absen.terlambatMenit ? (
                    <span className="text-red-500 font-bold text-[10px] bg-red-50 px-1.5 py-0.5 rounded border border-red-100">Telat {absen.terlambatMenit}m</span>
                 ) : null}
               </div>

            </div>
            
            {!isEditing && isComplete && (
               <div className="flex flex-col items-end">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold ${ba?.konfirmasiHadir ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                     {ba?.konfirmasiHadir ? <CheckCircle size={14} /> : <XCircle size={14} />}
                     {ba?.konfirmasiHadir ? 'Hadir' : 'Tidak Hadir'}
                  </span>
                  <button 
                     onClick={() => setIsEditing(true)}
                     className="mt-2 text-[10px] font-bold text-[var(--color-primary)] uppercase tracking-wider hover:underline flex items-center gap-1"
                  >
                     <PenLine size={10} /> Edit
                  </button>
               </div>
            )}
         </div>
         
         <div className="bg-[var(--color-surface-light)] rounded-xl p-3 mb-4 flex-1">
            <p className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Materi Ajar</p>
            <p className="text-sm font-semibold text-[var(--color-text)] line-clamp-2" title={absen.materi}>{absen.materi}</p>
         </div>

         {isEditing && (
            <div className="pt-4 border-t border-[var(--color-surface)] space-y-4 animate-in fade-in slide-in-from-top-1">
               <div className="grid grid-cols-2 gap-3">
                  <button
                     onClick={() => setKonfirmasi(true)}
                     className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${konfirmasi === true ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-[var(--color-surface-dark)] bg-white text-[var(--color-text-muted)] hover:border-emerald-200'}`}
                  >
                     <CheckCircle size={24} className="mb-1" />
                     <span className="text-xs font-bold">Benar, Guru Hadir</span>
                  </button>
                  <button
                     onClick={() => setKonfirmasi(false)}
                     className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${konfirmasi === false ? 'border-red-500 bg-red-50 text-red-600' : 'border-[var(--color-surface-dark)] bg-white text-[var(--color-text-muted)] hover:border-red-200'}`}
                  >
                     <XCircle size={24} className="mb-1" />
                     <span className="text-xs font-bold text-center">Tidak, Guru Tdk Hadir</span>
                  </button>
               </div>

               <div>
                  <textarea 
                     placeholder="Tambahkan catatan jika perlu (contoh: guru pulang lebih awal)..."
                     value={catatan}
                     onChange={(e) => setCatatan(e.target.value)}
                     className="w-full text-sm font-medium border border-[var(--color-surface-dark)] rounded-xl p-3 bg-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 resize-none min-h-[80px]"
                  />
               </div>

               <div className="flex gap-2 justify-end">
                  {isComplete && (
                     <button 
                        onClick={() => {
                           setKonfirmasi(ba?.konfirmasiHadir ?? null);
                           setCatatan(ba?.catatan || "");
                           setIsEditing(false);
                        }}
                        className="px-4 py-2 text-xs font-bold rounded-xl border border-[var(--color-surface-dark)] bg-white text-[var(--color-text)]"
                     >
                        Batal
                     </button>
                  )}
                  <button
                     onClick={save}
                     disabled={konfirmasi === null || isSubmitting}
                     className="px-5 py-2 text-xs font-bold rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition disabled:opacity-50"
                  >
                     {isSubmitting ? 'Menyimpan...' : 'Simpan Berita Acara'}
                  </button>
               </div>
            </div>
         )}
      </div>
   );
}
