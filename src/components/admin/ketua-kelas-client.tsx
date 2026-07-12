"use client";

import React, { useEffect, useState } from "react";
import { User, CheckCircle, Search, Shield, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

type KelasInfo = {
  id: string;
  nama: string;
  programId: string;
  programNama: string;
};

type SantriRow = {
  id: string;
  nama: string;
  isAktif: boolean;
};

type KetuaKelasRecord = {
  id: string;
  kelasId: string;
  santriId: string;
  santri: {
    id: string;
    nama: string;
    isAktif: boolean;
  };
  kelas: {
    nama: string;
  };
};

export function KetuaKelasClient({ kelasList }: { kelasList: KelasInfo[] }) {
  const [selectedKelas, setSelectedKelas] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [santriList, setSantriList] = useState<SantriRow[]>([]);
  const [ketuaKelasList, setKetuaKelasList] = useState<KetuaKelasRecord[]>([]);
  
  const [isLoadingSantri, setIsLoadingSantri] = useState(false);
  const [isLoadingKetua, setIsLoadingKetua] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Group kelas by program
  const kelasByProgram = kelasList.reduce((acc, k) => {
    if (!acc[k.programNama]) acc[k.programNama] = [];
    acc[k.programNama].push(k);
    return acc;
  }, {} as Record<string, KelasInfo[]>);

  // 1. Fetch data ketua kelas aktif (semua)
  const fetchKetuaKelas = async () => {
    setIsLoadingKetua(true);
    try {
      const res = await fetch("/api/admin/ketua-kelas?kelasId=ALL");
      const result = await res.json();
      if (result.success) {
        setKetuaKelasList(result.data);
      }
    } catch (e) {
      console.error(e);
      toast.error("Gagal memuat data ketua kelas");
    } finally {
      setIsLoadingKetua(false);
    }
  };

  useEffect(() => {
    fetchKetuaKelas();
  }, []);

  // 2. Fetch santri ketika kelas dipilih
  useEffect(() => {
    if (!selectedKelas) {
      setSantriList([]);
      return;
    }

    const fetchSantri = async () => {
      setIsLoadingSantri(true);
      try {
        const res = await fetch(`/api/admin/santri?kelasId=${selectedKelas}&isAktif=true`);
        const result = await res.json();
        
        if (result.success) {
          // Flatten data from santri api wrapper if needed, assume it returns array in data or success array
          if (Array.isArray(result.data)) {
            setSantriList(result.data);
          } else {
             const santriData = result.data.map((r:any) => ({
                 id: r.santri.id,
                 nama: r.santri.nama,
                 isAktif: r.santri.isAktif
             }));
             setSantriList(santriData);
          }
        }
      } catch (e) {
        console.error(e);
        toast.error("Gagal memuat santri untuk kelas ini");
      } finally {
        setIsLoadingSantri(false);
      }
    };

    fetchSantri();
  }, [selectedKelas]);

  // 3. Handle penunjukan ketua kelas
  const handleSetKetuaKelas = async (santriId: string, namaSantri: string) => {
    if (!selectedKelas) return;

    if (!confirm(`Tunjuk ${namaSantri} sebagai ketua kelas? Ini akan menggantikan ketua kelas yang lama di kelas ini.`)) return;

    setIsSubmitting(true);
    const toastId = toast.loading("Menyimpan...");

    try {
      const res = await fetch("/api/admin/ketua-kelas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kelasId: selectedKelas, santriId }),
      });

      const result = await res.json();
      if (result.success) {
        toast.success(result.message, { id: toastId });
        fetchKetuaKelas(); // Refresh list
      } else {
        toast.error(result.error || "Gagal menyimpan", { id: toastId });
      }
    } catch (e) {
      console.error(e);
      toast.error("Terjadi kesalahan jaringan", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Handle penonaktifan ketua kelas
  const handleDisableKetuaKelas = async () => {
    if (!selectedKelas) return;

    if (!confirm(`Nonaktifkan fitur berita acara untuk kelas ini?`)) return;

    setIsSubmitting(true);
    const toastId = toast.loading("Menyimpan...");

    try {
      const res = await fetch(`/api/admin/ketua-kelas?kelasId=${selectedKelas}`, {
        method: "DELETE",
      });

      const result = await res.json();
      if (result.success) {
        toast.success(result.message, { id: toastId });
        fetchKetuaKelas(); // Refresh list
      } else {
        toast.error(result.error || "Gagal menonaktifkan", { id: toastId });
      }
    } catch (e) {
      console.error(e);
      toast.error("Terjadi kesalahan jaringan", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeKetuaInSelectedKelas = ketuaKelasList.find(k => k.kelasId === selectedKelas);
  const filteredSantri = santriList.filter(s => s.nama.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      
      {/* LEFT COLUMN: SELECTION */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white rounded-3xl p-6 border border-[var(--color-surface-dark)] shadow-sm space-y-5">
          <h2 className="text-lg font-bold text-[var(--color-primary)] flex items-center gap-2">
            <Shield size={20} />
            Pilih Kelas
          </h2>

          <div>
            <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2 block">Kelas</label>
            <select
              value={selectedKelas}
              onChange={(e) => setSelectedKelas(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-surface-dark)] bg-[var(--color-secondary)] px-4 py-3 text-sm font-semibold text-[var(--color-text)] outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
            >
              <option value="">-- Pilih Kelas --</option>
              {Object.entries(kelasByProgram).map(([programName, classes]) => (
                <optgroup key={programName} label={programName}>
                  {classes.map(k => {
                    const isActiveClass = ketuaKelasList.some(ketua => ketua.kelasId === k.id);
                    return (
                      <option key={k.id} value={k.id}>
                        {k.nama} {isActiveClass ? "🟢 (Aktif)" : ""}
                      </option>
                    )
                  })}
                </optgroup>
              ))}
            </select>
          </div>

           {selectedKelas && (
            <div className="pt-4 border-t border-[var(--color-surface-dark)]">
              
              {/* STATUS INDICATOR CARD */}
              <div className={`p-4 rounded-xl mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border ${activeKetuaInSelectedKelas ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text)] flex items-center gap-2">
                    Status Berita Acara: 
                    {activeKetuaInSelectedKelas ? (
                      <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-xs">AKTIF</span>
                    ) : (
                      <span className="text-slate-600 bg-slate-200 px-2 py-0.5 rounded text-xs">NON-AKTIF</span>
                    )}
                  </h3>
                  <p className="text-xs font-medium text-[var(--color-text-subtle)] mt-1">
                    {activeKetuaInSelectedKelas 
                      ? "Absensi di kelas ini wajib diverifikasi oleh ketua kelas sebelum dianggap valid."
                      : "Absensi di kelas ini otomatis langsung valid tanpa melalui verifikasi santri."
                    }
                  </p>
                </div>
                {activeKetuaInSelectedKelas && (
                  <button 
                    onClick={handleDisableKetuaKelas}
                    disabled={isSubmitting}
                    className="shrink-0 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold rounded-lg transition-colors border border-red-200"
                  >
                    Non-aktifkan
                  </button>
                )}
              </div>

              <h3 className="text-sm font-bold text-[var(--color-text)] mb-3">Pilih Santri Penanggung Jawab</h3>
              
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-subtle)]" />
                <input
                  type="text"
                  placeholder="Cari santri..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[var(--color-surface-light)] border border-transparent focus:border-[var(--color-primary-300)] focus:bg-white rounded-xl text-sm font-medium outline-none transition-all"
                />
              </div>

              {isLoadingSantri ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
                </div>
              ) : santriList.length === 0 ? (
                <div className="text-center py-6 text-sm font-medium text-[var(--color-text-muted)]">
                  Tidak ada santri aktif di kelas ini.
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredSantri.map(santri => {
                    const isCurrentKetua = activeKetuaInSelectedKelas?.santriId === santri.id;
                    return (
                      <div 
                        key={santri.id} 
                        className={`flex items-center justify-between p-3 rounded-xl border bg-white ${isCurrentKetua ? 'border-amber-300 bg-amber-50/50' : 'border-[var(--color-surface)] hover:border-violet-200'} transition-colors`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${isCurrentKetua ? 'bg-amber-100 text-amber-700' : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'}`}>
                            <User size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[var(--color-text)] leading-tight">{santri.nama}</p>
                            {isCurrentKetua && (
                              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mt-1 block">Ketua Saat Ini</span>
                            )}
                          </div>
                        </div>
                        {!isCurrentKetua && (
                          <button
                            onClick={() => handleSetKetuaKelas(santri.id, santri.nama)}
                            disabled={isSubmitting}
                            className="px-3 py-1.5 bg-violet-50 text-violet-700 hover:bg-violet-600 hover:text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                          >
                            Tunjuk
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: LIST */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-3xl overflow-hidden border border-[var(--color-surface-dark)] shadow-sm">
          <div className="p-6 border-b border-[var(--color-surface)] bg-slate-50/50 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--color-text)]">Ketua Kelas Aktif</h2>
              <p className="text-xs font-medium text-[var(--color-text-muted)] mt-1">Daftar santri yang bertugas sebagai verifikator absen.</p>
            </div>
            <button 
              onClick={fetchKetuaKelas} 
              disabled={isLoadingKetua}
              className="p-2 bg-white border border-[var(--color-surface-dark)] rounded-xl hover:bg-slate-50 text-[var(--color-text-muted)] transition"
              title="Refresh"
            >
              <RefreshCw size={16} className={isLoadingKetua ? "animate-spin" : ""} />
            </button>
          </div>

          {isLoadingKetua ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600"></div>
            </div>
          ) : ketuaKelasList.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-center">
              <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Shield className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-base font-bold text-[var(--color-text)]">Belum ada ketua kelas</p>
              <p className="text-sm text-[var(--color-text-muted)] mt-2 max-w-sm">Silakan pilih kelas di samping kiri lalu tunjuk santri untuk menjadi ketua kelas.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[var(--color-secondary)] border-b border-[var(--color-surface-dark)]">
                  <tr>
                    <th className="px-6 py-3 font-bold text-[var(--color-text-muted)] text-xs uppercase tracking-wider w-[120px]">Kelas</th>
                    <th className="px-6 py-3 font-bold text-[var(--color-text-muted)] text-xs uppercase tracking-wider">Santri Verifikator</th>
                    <th className="px-6 py-3 font-bold text-[var(--color-text-muted)] text-xs uppercase tracking-wider text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-surface)]">
                  {ketuaKelasList.map((k) => (
                    <tr key={k.id} className="hover:bg-[var(--color-surface-light)] transition">
                      <td className="px-6 py-4 font-bold text-[var(--color-primary)]">
                        {k.kelas.nama}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center flex-shrink-0">
                            <User size={14} />
                          </div>
                          <div>
                            <p className="font-bold text-[var(--color-text)]">{k.santri.nama}</p>
                            {!k.santri.isAktif && (
                              <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded mt-0.5 inline-block border border-red-100">
                                Santri Tidak Aktif
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                          <CheckCircle size={14} />
                          Aktif
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
