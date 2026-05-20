"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { toast } from "react-hot-toast";

type SantriAbsenTarget = {
  riwayatId: string;
  santriId: string;
  nama: string;
  sakan: string;
  kamar: string;
  gender: string;
  kategori: string;
  kelasId: string | null;
  kelasNama: string | null;
  programId: string | null;
  programNama: string | null;
};

type AbsenStatus = "HADIR" | "IZIN" | "SAKIT" | "ALPHA";

export function AbsensiSakanClient({ sakanList, defaultSakan }: { sakanList: string[]; defaultSakan?: string }) {
  const [tanggal, setTanggal] = useState("");
  const [sakan, setSakan] = useState(defaultSakan || "ALL");
  const [santriList, setSantriList] = useState<SantriAbsenTarget[]>([]);
  const [absenMap, setAbsenMap] = useState<Record<string, { status: AbsenStatus; keterangan: string }>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Set default tanggal to today WIB
    const wib = new Date(new Date().getTime() + 7 * 60 * 60 * 1000);
    setTanggal(wib.toISOString().split("T")[0]);
  }, []);

  useEffect(() => {
    if (!tanggal) return;
    
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/admin/absensi/sakan?tanggal=${tanggal}&sakan=${sakan}`);
        const data = await res.json();
        
        if (data.santriList) {
          setSantriList(data.santriList);
        }
        
        const newMap: Record<string, any> = {};
        if (data.absenData) {
          data.absenData.forEach((a: any) => {
            newMap[a.riwayatId] = { status: a.status, keterangan: a.keterangan || "" };
          });
        }
        setAbsenMap(newMap);
      } catch (error) {
        toast.error("Gagal memuat data absensi");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [tanggal, sakan]);

  const handleStatusChange = (riwayatId: string, status: AbsenStatus) => {
    setAbsenMap(prev => ({
      ...prev,
      [riwayatId]: { ...prev[riwayatId], status, keterangan: prev[riwayatId]?.keterangan || "" }
    }));
  };

  const handleKeteranganChange = (riwayatId: string, keterangan: string) => {
    setAbsenMap(prev => ({
      ...prev,
      [riwayatId]: { ...prev[riwayatId], status: prev[riwayatId]?.status || "ALPHA", keterangan }
    }));
  };

  const setAllStatus = (status: AbsenStatus) => {
    const newMap = { ...absenMap };
    santriList.forEach(s => {
      newMap[s.riwayatId] = { status, keterangan: newMap[s.riwayatId]?.keterangan || "" };
    });
    setAbsenMap(newMap);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const absenList = Object.entries(absenMap).map(([riwayatId, data]) => ({
        riwayatId,
        status: data.status,
        keterangan: data.keterangan,
      }));

      const res = await fetch("/api/admin/absensi/sakan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tanggal, absenList }),
      });
      
      const result = await res.json();
      if (result.success) {
        toast.success(`Berhasil menyimpan ${result.count} data absensi`);
      } else {
        toast.error(result.error || "Gagal menyimpan absensi");
      }
    } catch (e) {
      toast.error("Terjadi kesalahan sistem");
    } finally {
      setIsSaving(false);
    }
  };

  const allOptions = [
    { id: "ALL", label: "Semua Sakan" },
    ...sakanList.map(s => ({ id: s, label: s })),
  ];

  const statHadir = Object.values(absenMap).filter(a => a.status === "HADIR").length;
  const statIzin = Object.values(absenMap).filter(a => a.status === "IZIN").length;
  const statSakit = Object.values(absenMap).filter(a => a.status === "SAKIT").length;
  const statAlpha = Object.values(absenMap).filter(a => a.status === "ALPHA").length;
  const belumDiabsen = santriList.length - Object.keys(absenMap).length;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-6 md:flex-row md:items-end md:justify-between bg-slate-50/50">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Tanggal
              </label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Filter Sakan
              </label>
              <select
                value={sakan}
                onChange={(e) => setSakan(e.target.value)}
                disabled={!!defaultSakan} // lock to defaultSakan if provided
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500 disabled:opacity-70 disabled:bg-slate-50"
              >
                {allOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setAllStatus("HADIR")}
              className="rounded-full bg-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-300"
            >
              Hadirkan Semua
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || isLoading || !tanggal}
              className="rounded-full bg-blue-600 px-6 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? "Menyimpan..." : "Simpan Absensi"}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-4 border-b border-slate-200 px-6 py-4 bg-white">
           <div className="flex items-center gap-2 text-sm font-bold">
             <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
             <span className="text-slate-700">Hadir: {statHadir}</span>
           </div>
           <div className="flex items-center gap-2 text-sm font-bold">
             <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
             <span className="text-slate-700">Izin: {statIzin}</span>
           </div>
           <div className="flex items-center gap-2 text-sm font-bold">
             <span className="h-2 w-2 rounded-full bg-amber-500"></span>
             <span className="text-slate-700">Sakit: {statSakit}</span>
           </div>
           <div className="flex items-center gap-2 text-sm font-bold">
             <span className="h-2 w-2 rounded-full bg-rose-500"></span>
             <span className="text-slate-700">Alpha: {statAlpha}</span>
           </div>
           <div className="flex items-center gap-2 text-sm font-bold pl-4 border-l border-slate-200">
             <span className="text-slate-400">Belum Diabsen: {belumDiabsen}</span>
           </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-sm font-semibold text-slate-500">Memuat data santri...</div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                <tr>
                  <th className="px-4 py-4 text-center w-16">#</th>
                  <th className="px-6 py-4">Santri</th>
                  <th className="px-6 py-4 min-w-[300px]">Status Kehadiran</th>
                  <th className="px-6 py-4">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                {santriList.map((santri, index) => {
                  const currentStatus = absenMap[santri.riwayatId]?.status;
                  const currentKet = absenMap[santri.riwayatId]?.keterangan || "";
                  
                  return (
                    <tr key={santri.riwayatId} className="hover:bg-slate-50/50">
                      <td className="px-4 py-4 text-center font-bold text-slate-400">{index + 1}</td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{santri.nama}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                            {santri.sakan ?? "-"}
                          </span>
                          {santri.kategori === "BARU" ? (
                            <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 capitalize">Baru</span>
                          ) : santri.kategori === "LAMA" ? (
                            <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 capitalize">Lama</span>
                          ) : santri.kategori === "KSU" ? (
                            <span className="inline-flex items-center rounded-md bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700 uppercase">KSU</span>
                          ) : (
                            <span className="inline-flex items-center rounded-md bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700 capitalize">{santri.kategori ?? "-"}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {(["HADIR", "IZIN", "SAKIT", "ALPHA"] as AbsenStatus[]).map((st) => (
                            <button
                              key={st}
                              onClick={() => handleStatusChange(santri.riwayatId, st)}
                              className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                                currentStatus === st
                                  ? st === "HADIR" ? "bg-emerald-500 text-white shadow-emerald-200 shadow-sm"
                                  : st === "IZIN" ? "bg-indigo-500 text-white shadow-indigo-200 shadow-sm"
                                  : st === "SAKIT" ? "bg-amber-500 text-white shadow-amber-200 shadow-sm"
                                  : "bg-rose-500 text-white shadow-rose-200 shadow-sm"
                                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          placeholder="Catatan..."
                          value={currentKet}
                          onChange={(e) => handleKeteranganChange(santri.riwayatId, e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none transition focus:border-blue-500"
                        />
                      </td>
                    </tr>
                  )
                })}
                {santriList.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500 font-medium">
                      Tidak ada santri yang ditemukan pada filter ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
