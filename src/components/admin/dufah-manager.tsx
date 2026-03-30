"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { Calendar, Save, Power, PowerOff } from "lucide-react";

type DufahData = {
  nama: string;
  usbu1StartDate: string | null;
  usbu1EndDate: string | null;
  usbu1Active: boolean;
  usbu2StartDate: string | null;
  usbu2EndDate: string | null;
  usbu2Active: boolean;
  usbu3StartDate: string | null;
  usbu3EndDate: string | null;
  usbu3Active: boolean;
  _count?: { riwayatRecords: number };
};

export function DufahManager({ initialData, activeDufahName }: { initialData: DufahData[], activeDufahName: string | null }) {
  const [data, setData] = useState<DufahData[]>(initialData);
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const router = useRouter();

  const handleUpdate = async (nama: string) => {
    const dufah = data.find(d => d.nama === nama);
    if (!dufah) return;

    setLoadingMap(prev => ({ ...prev, [nama]: true }));
    const loaders = toast.loading("Menyimpan...");
    try {
      const res = await fetch("/api/admin/dufah/usbu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dufah),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      
      toast.success("Pengaturan Usbu' berhasil disimpan", { id: loaders });
      router.refresh();
      setData(data.map(d => d.nama === nama ? { ...d, ...result.dufah } : d));
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan pengaturan", { id: loaders });
    } finally {
      setLoadingMap(prev => ({ ...prev, [nama]: false }));
    }
  };

  const handleChange = (nama: string, field: keyof DufahData, value: string | boolean | null) => {
    setData(data.map(d => {
      if (d.nama !== nama) return d;
      return { ...d, [field]: value };
    }));
  };

  const toYMD = (dateString: string | null) => {
    if (!dateString) return "";
    return new Date(dateString).toISOString().split('T')[0];
  };

  return (
    <div className="space-y-6">
      {data.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-xl border border-dashed border-slate-300">
          <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Belum ada data angkatan dari API Pusat.</p>
        </div>
      ) : (
        data.map((dufah) => {
          const isActive = dufah.nama === activeDufahName;
          const loading = loadingMap[dufah.nama] || false;
          
          return (
            <div key={dufah.nama} className={`rounded-xl shadow-sm border overflow-hidden transition-all ${isActive ? "bg-white border-emerald-200 ring-2 ring-emerald-50" : "bg-slate-50 border-slate-200"}`}>
              <div className="px-6 py-4 border-b bg-slate-50/50 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className={`text-lg font-bold ${isActive ? "text-emerald-900" : "text-slate-600"}`}>{dufah.nama}</h3>
                    {isActive ? (
                      <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-700 uppercase tracking-widest">Dufah Berjalan</span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-slate-200 text-slate-500 uppercase tracking-widest">Selesai / Non-Aktif</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-medium flex items-center gap-1">
                    Total Santri: {dufah._count?.riwayatRecords || 0}
                  </p>
                </div>
                <button
                  onClick={() => handleUpdate(dufah.nama)}
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Simpan Perubahan
                </button>
              </div>

              <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((u) => {
                  const num = u as 1 | 2 | 3;
                  const prefix = `usbu${num}` as const;
                  const label = num === 3 ? "Nihai" : `Usbu' ${num}`;
                  
                  const sActive = dufah[`${prefix}Active`];
                  const sStart = dufah[`${prefix}StartDate`];
                  const sEnd = dufah[`${prefix}EndDate`];

                  return (
                    <div key={num} className={`rounded-xl border p-4 transition duration-200 ${sActive ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-200"}`}>
                      <div className="flex justify-between items-center border-b pb-3 mb-4">
                        <h4 className={`font-bold ${sActive ? "text-emerald-800" : "text-slate-500"}`}>{label}</h4>
                        <button
                          onClick={() => handleChange(dufah.nama, `${prefix}Active`, !sActive)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${sActive ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-slate-200 hover:bg-slate-300 text-slate-600"}`}
                        >
                          {sActive ? <Power className="h-3.5 w-3.5" /> : <PowerOff className="h-3.5 w-3.5" />}
                          {sActive ? "Status Aktif" : "Tidak Aktif"}
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Mulai Tanggal</label>
                          <input 
                            type="date"
                            value={toYMD(sStart)}
                            onChange={(e) => handleChange(dufah.nama, `${prefix}StartDate`, e.target.value ? new Date(e.target.value).toISOString() : null)}
                            className="w-full text-sm rounded-lg border-slate-300 px-3 py-2 bg-white disabled:bg-slate-100 disabled:text-slate-400 focus:ring-emerald-500 focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Sampai Tanggal</label>
                          <input 
                            type="date"
                            value={toYMD(sEnd)}
                            onChange={(e) => handleChange(dufah.nama, `${prefix}EndDate`, e.target.value ? new Date(e.target.value).toISOString() : null)}
                            className="w-full text-sm rounded-lg border-slate-300 px-3 py-2 bg-white disabled:bg-slate-100 disabled:text-slate-400 focus:ring-emerald-500 focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

