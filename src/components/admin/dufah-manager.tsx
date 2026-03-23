"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { Plus, ArrowRight, RotateCcw, Calendar, CheckCircle } from "lucide-react";

type DufahData = {
  nama: string;
  currentUsbu: number;
  usbu1EndDate: string | null;
  usbu2EndDate: string | null;
  usbu3EndDate: string | null;
  _count?: { riwayatRecords: number };
};

export function DufahManager({ initialData, activeDufahName }: { initialData: DufahData[], activeDufahName: string | null }) {
  const [data, setData] = useState<DufahData[]>(initialData);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleUsbuAction = async (nama: string, action: 'NEXT' | 'PREVIOUS') => {
    if (action === 'NEXT') {
      if (!confirm(`Apakah Anda yakin ingin MENGAKHIR Usbu' ini dan maju ke Usbu' selanjutnya untuk angkatan ${nama}? Ini akan membuat Rapor Bayangan.`)) return;
    } else {
      if (!confirm(`PERINGATAN! Anda akan MEMBATALKAN batas Usbu' terakhir untuk angkatan ${nama}. Data absen santri aman, tapi perhitungan usbu' akan mundur. Lanjutkan?`)) return;
    }

    const loaders = toast.loading("Memproses...");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/dufah/usbu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama, action }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      
      toast.success("Status Usbu' berhasil diperbarui", { id: loaders });
      router.refresh();
      
      // Update local state optimistically
      setData(data.map(d => d.nama === nama ? { ...d, ...result.dufah } : d));
    } catch (err: any) {
      toast.error(err.message || "Gagal memperbarui status Usbu'", { id: loaders });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
    });
  };

  return (
    <div className="space-y-4">
      {data.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-xl border border-dashed border-slate-300">
          <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Belum ada data angkatan dari API Pusat.</p>
        </div>
      ) : (
        data.map((dufah) => {
          const isActive = dufah.nama === activeDufahName;
          
          return (
            <div key={dufah.nama} className={`rounded-xl shadow-sm border p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all ${isActive ? "bg-white border-emerald-200 ring-2 ring-emerald-50 ring-offset-2" : "bg-slate-50/70 border-slate-200"}`}>
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className={`text-lg font-bold ${isActive ? "text-emerald-900" : "text-slate-600"}`}>{dufah.nama}</h3>
                  <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                    dufah.currentUsbu === 4 
                      ? 'bg-slate-200 text-slate-600' 
                      : (isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500')
                  }`}>
                    {dufah.currentUsbu === 4 ? "Selesai" : `Usbu' ${dufah.currentUsbu}`}
                  </span>
                  {!isActive && (
                    <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-slate-200 text-slate-500 uppercase tracking-widest">
                      Tidak Aktif
                    </span>
                  )}
                </div>
                
                <p className="text-xs text-slate-500 mb-4 font-medium flex items-center gap-1">
                  <span className={`${isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-600"} px-2 py-1 rounded`}>Total Santri: {dufah._count?.riwayatRecords || 0}</span>
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className={`${isActive ? "bg-slate-50 border-slate-100" : "bg-white/50 border-slate-200/60"} rounded-lg p-3 border`}>
                    <p className={`${isActive ? "text-slate-500" : "text-slate-400"} font-semibold mb-1 uppercase tracking-wider text-[10px]`}>Batas Usbu' 1</p>
                    <p className={`font-medium ${isActive ? "text-slate-800" : "text-slate-500"}`}>{formatDate(dufah.usbu1EndDate)}</p>
                  </div>
                  <div className={`${isActive ? "bg-slate-50 border-slate-100" : "bg-white/50 border-slate-200/60"} rounded-lg p-3 border`}>
                    <p className={`${isActive ? "text-slate-500" : "text-slate-400"} font-semibold mb-1 uppercase tracking-wider text-[10px]`}>Batas Usbu' 2</p>
                    <p className={`font-medium ${isActive ? "text-slate-800" : "text-slate-500"}`}>{formatDate(dufah.usbu2EndDate)}</p>
                  </div>
                  <div className={`${isActive ? "bg-slate-50 border-slate-100" : "bg-white/50 border-slate-200/60"} rounded-lg p-3 border`}>
                    <p className={`${isActive ? "text-slate-500" : "text-slate-400"} font-semibold mb-1 uppercase tracking-wider text-[10px]`}>Batas Usbu' 3 (Nihai)</p>
                    <p className={`font-medium ${isActive ? "text-slate-800" : "text-slate-500"}`}>{formatDate(dufah.usbu3EndDate)}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-row md:flex-col gap-2 min-w-[160px]">
                {dufah.currentUsbu < 4 && (
                  <button
                    onClick={() => handleUsbuAction(dufah.nama, 'NEXT')}
                    disabled={loading || !isActive}
                    className={`flex-1 font-bold py-2 px-4 justify-center rounded-lg text-xs transition-colors flex items-center gap-2 group ${isActive ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
                  >
                    Aktifkan Usbu' {dufah.currentUsbu + 1}
                    {isActive && <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />}
                  </button>
                )}
                
                {dufah.currentUsbu === 4 && (
                  <div className="flex-1 bg-slate-200 text-slate-500 font-bold py-2 px-4 justify-center rounded-lg text-xs flex items-center gap-2">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Angkatan Lulus
                  </div>
                )}

                {dufah.currentUsbu > 1 && (
                  <button
                    onClick={() => handleUsbuAction(dufah.nama, 'PREVIOUS')}
                    disabled={loading || !isActive}
                    className={`flex-1 border font-semibold py-2 px-4 justify-center rounded-lg text-xs transition-colors flex items-center gap-2 ${isActive ? "bg-white hover:bg-red-50 text-red-600 border-red-200" : "bg-transparent border-slate-300 text-slate-400 cursor-not-allowed"}`}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Batal (Undo Usbu' {dufah.currentUsbu - 1})
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
