"use client";

import React, { useState, useEffect, Fragment } from "react";
import { useRouter } from "next/navigation";

type MapelOption = {
  id: string;
  nama_indo: string;
  nama_arab: string;
  jumlah_tes: number;
  bulan_aktif?: number;
  jumlah_tes_b2?: number | null;
  bobot?: number;
  bobot_usbu?: number;
};

type KelasOption = {
  id: string;
  nama: string;
};

type ProgramOption = {
  id: string;
  nama_indo: string;
  mapelList: MapelOption[];
  kelasList: KelasOption[];
};

type NilaiData = {
  u1: number | null;
  u2: number | null;
  n: number | null;
  a: number | null;
};

type SantriRow = {
  riwayatId: string;
  santriId: string;
  nama: string;
  is_tasmi: boolean;
  nilai: Record<string, NilaiData>;
};

type ChangesRow = {
  is_tasmi?: boolean;
  nilai?: Record<string, Partial<NilaiData>>;
};

export function InputNilaiBulkClient({
  programList,
  allowedKelasId,
  isAdmin,
  activeFlags
}: {
  programList: ProgramOption[];
  allowedKelasId: string | null;
  isAdmin: boolean;
  activeFlags: { u1: boolean; u2: boolean; u3: boolean };
}) {
  const router = useRouter();
  const [selectedKelasId, setSelectedKelasId] = useState<string>("");
  const [santriList, setSantriList] = useState<SantriRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [changes, setChanges] = useState<Record<string, ChangesRow>>({});
  const [akbarnasMonth, setAkbarnasMonth] = useState<1 | 2>(1);

  // Filter program & kelas based on allowedKelasId
  const availablePrograms = programList.map(p => {
    return {
      ...p,
      kelasList: isAdmin ? p.kelasList : p.kelasList.filter(k => k.id === allowedKelasId)
    };
  }).filter(p => p.kelasList.length > 0);

  // Auto select class if only 1 is allowed
  useEffect(() => {
    if (!isAdmin && allowedKelasId) {
      setSelectedKelasId(allowedKelasId);
    }
  }, [isAdmin, allowedKelasId]);

  const selectedProgram = availablePrograms.find(p => p.kelasList.some(k => k.id === selectedKelasId));

  // Fetch data when Kelas or akbarnasMonth is selected
  useEffect(() => {
    if (selectedKelasId) {
      fetchData();
    } else {
      setSantriList([]);
      setChanges({});
    }
  }, [selectedKelasId, akbarnasMonth]);

  const fetchData = async () => {
    setIsLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/admin/input-nilai-kelas?kelasId=${selectedKelasId}&month=${akbarnasMonth}`);
      if (!res.ok) throw new Error("Gagal mengambil data");
      const data = await res.json();
      setSantriList(data);
      setChanges({});
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat memuat data santri");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTasmiChange = (riwayatId: string, checked: boolean) => {
    setChanges(prev => ({
      ...prev,
      [riwayatId]: {
        ...prev[riwayatId],
        is_tasmi: checked
      }
    }));
  };

  const handleNilaiChange = (riwayatId: string, mapelId: string, field: keyof NilaiData, value: number | null) => {
    setChanges(prev => {
      const rowChanges = prev[riwayatId] || {};
      const rowNilaiChanges = rowChanges.nilai || {};
      const mapelChanges = rowNilaiChanges[mapelId] || {};
      
      return {
        ...prev,
        [riwayatId]: {
          ...rowChanges,
          nilai: {
            ...rowNilaiChanges,
            [mapelId]: {
              ...mapelChanges,
              [field]: value
            }
          }
        }
      };
    });
  };

  const getTasmiVal = (row: SantriRow) => {
    if (changes[row.riwayatId] && changes[row.riwayatId].is_tasmi !== undefined) {
      return changes[row.riwayatId].is_tasmi;
    }
    return row.is_tasmi;
  };

  const getNilaiVal = (row: SantriRow, mapelId: string, field: keyof NilaiData) => {
    if (changes[row.riwayatId]?.nilai?.[mapelId]?.[field] !== undefined) {
      return changes[row.riwayatId].nilai![mapelId][field] as number | null;
    }
    return row.nilai?.[mapelId]?.[field] ?? null;
  };

  const handleSave = async () => {
    if (Object.keys(changes).length === 0) {
      setSuccess("Tidak ada perubahan untuk disimpan.");
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccess("");

    const updates = Object.entries(changes).map(([riwayatId, partialUpdate]) => {
      return {
        riwayatId,
        ...partialUpdate
      };
    });

    try {
      const res = await fetch("/api/admin/input-nilai-kelas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates
        })
      });

      if (!res.ok) throw new Error("Gagal menyimpan data");
      
      setSuccess("Berhasil menyimpan seluruh nilai kelas.");
      setChanges({});
      // Refresh underlying data
      fetchData();
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan data");
    } finally {
      setIsSaving(false);
    }
  };

  const isAkbarnas = selectedProgram?.nama_indo.toLowerCase().includes("akbarnas") ?? false;

  let mapels = selectedProgram?.mapelList || [];

  if (isAkbarnas) {
    mapels = mapels.filter((mapel) => {
      if (akbarnasMonth === 2) {
        return mapel.bulan_aktif !== 1;
      } else {
        return mapel.bulan_aktif !== 2;
      }
    }).map((mapel) => {
      if (akbarnasMonth === 2 && mapel.jumlah_tes_b2 !== null && mapel.jumlah_tes_b2 !== undefined) {
        return { ...mapel, jumlah_tes: mapel.jumlah_tes_b2 };
      }
      return mapel;
    });
  }

  return (
    <div className="space-y-6">
      {/* Filter Section */}
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-6 md:grid-cols-2">
          <label className="space-y-2 text-sm font-semibold text-slate-700">
            <span>Pilih Ruangan Kelas</span>
            <select
              value={selectedKelasId}
              onChange={(e) => setSelectedKelasId(e.target.value)}
              disabled={!isAdmin && !!allowedKelasId}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-bold outline-none transition focus:border-emerald-500 focus:bg-white disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <option value="">-- Pilih Kelas --</option>
              {availablePrograms.map((p) => (
                <optgroup key={p.id} label={p.nama_indo}>
                  {p.kelasList.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          {isAkbarnas && (
            <label className="space-y-2 text-sm font-semibold text-slate-700">
              <span>Bulan Pembelajaran (Khusus Akbarnas)</span>
              <select
                value={akbarnasMonth}
                onChange={(e) => setAkbarnasMonth(Number(e.target.value) as 1 | 2)}
                className="w-full rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-base font-bold text-indigo-900 outline-none transition focus:border-indigo-500 focus:bg-white"
              >
                <option value={1}>Bulan 1 (Riwayat Baru)</option>
                <option value={2}>Bulan 2 (Riwayat Lanjutan)</option>
              </select>
            </label>
          )}
        </div>
      </section>

      {/* Messages */}
      {error && <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}
      {success && <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{success}</div>}

      {/* Table Section */}
      {selectedKelasId && selectedProgram && (
        <section className="rounded-[2rem] border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Master Sheet Penilaian Kelas</h3>
              <p className="text-sm text-slate-500 mt-1">Gunakan tombol Tab untuk berpindah antar kolom secara cepat.</p>
            </div>
            <button
              onClick={handleSave}
              disabled={isSaving || Object.keys(changes).length === 0}
              className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
            >
              {isSaving ? "Menyimpan..." : "Simpan Semua Perubahan"}
            </button>
          </div>

          <div className="overflow-x-auto w-full custom-scrollbar">
            <table className="w-full text-left text-sm text-slate-600 border-collapse min-w-max">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.1em] text-slate-500">
                <tr>
                  <th className="px-2 md:px-4 py-3 font-semibold text-center border-b border-slate-200 sticky left-0 bg-slate-50 z-20 border-r min-w-[40px] w-[40px] md:min-w-[50px] md:w-[50px]" rowSpan={2}>No</th>
                  <th className="px-3 md:px-4 py-3 font-semibold border-b border-slate-200 sticky left-[40px] md:left-[50px] bg-slate-50 z-20 border-r min-w-[140px] w-[140px] md:min-w-[250px] md:w-[250px] text-xs md:text-sm" rowSpan={2}>Nama Peserta Didik</th>
                  <th className="px-4 py-3 font-semibold text-center border-b border-r border-slate-200 md:sticky md:left-[300px] bg-slate-50 md:z-20 min-w-[80px] w-[80px]" rowSpan={2}>Tasmi'</th>
                  {mapels.map(m => (
                    <th key={m.id} className="px-2 py-2 font-bold text-center border-b border-r border-slate-200 bg-slate-100" colSpan={m.jumlah_tes === 3 ? 3 : 1}>
                      <div>{m.nama_indo}</div>
                    </th>
                  ))}
                </tr>
                <tr>
                  {mapels.map(m => {
                    if (m.jumlah_tes === 3) {
                      const wUsbu = m.bobot_usbu ?? 0;
                      const wNihai = m.bobot ?? 0;
                      return (
                        <Fragment key={`sub_${m.id}`}>
                          <th className="px-2 py-2 font-semibold text-center border-b border-slate-200 bg-slate-50 w-20 text-[10px]">
                            <div>U1</div>
                            <div className="text-[9px] text-slate-400 font-medium">({wUsbu}%)</div>
                          </th>
                          <th className="px-2 py-2 font-semibold text-center border-b border-slate-200 bg-slate-50 w-20 text-[10px]">
                            <div>U2</div>
                            <div className="text-[9px] text-slate-400 font-medium">({wUsbu}%)</div>
                          </th>
                          <th className="px-2 py-2 font-semibold text-center border-b border-r border-slate-200 bg-slate-50 w-20 text-[10px]">
                            <div>Nihai</div>
                            <div className="text-[9px] text-emerald-600 font-bold">({wNihai}%)</div>
                          </th>
                        </Fragment>
                      );
                    }
                    return (
                      <th key={`sub_${m.id}`} className="px-2 py-2 font-semibold text-center border-b border-r border-slate-200 bg-slate-50 w-24 text-[10px]">
                        Akhir
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr><td colSpan={3 + mapels.reduce((a, b) => a + (b.jumlah_tes === 3 ? 3 : 1), 0)} className="text-center py-12 text-slate-500">Memuat data santri...</td></tr>
                ) : santriList.length === 0 ? (
                  <tr><td colSpan={3 + mapels.reduce((a, b) => a + (b.jumlah_tes === 3 ? 3 : 1), 0)} className="text-center py-12 text-slate-500">Tidak ada santri aktif di kelas ini.</td></tr>
                ) : (
                  santriList.map((row, index) => {
                    const tasmi = getTasmiVal(row);
                    const hasChange = !!changes[row.riwayatId];

                    return (
                      <tr key={row.riwayatId} className={`transition hover:bg-slate-50/80 ${hasChange ? 'bg-amber-50/10' : ''}`}>
                        <td className="px-2 md:px-4 py-2 text-center font-medium text-slate-400 sticky left-0 bg-white z-10 border-r border-slate-100 shadow-[1px_0_0_0_#f1f5f9] min-w-[40px] md:min-w-[50px]">{index + 1}</td>
                        <td className="px-3 md:px-4 py-2 font-bold text-slate-800 sticky left-[40px] md:left-[50px] bg-white z-10 border-r border-slate-100 shadow-[1px_0_0_0_#f1f5f9] min-w-[140px] w-[140px] md:min-w-[250px] md:w-[250px] whitespace-normal leading-snug text-xs md:text-sm">{row.nama}</td>
                        <td className="px-4 py-2 text-center md:sticky md:left-[300px] bg-white md:z-10 border-r border-slate-200 md:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] min-w-[80px]">
                          {activeFlags.u3 ? (
                            <label className="inline-flex cursor-pointer items-center justify-center w-full h-full">
                              <input 
                                type="checkbox" 
                                checked={tasmi}
                                onChange={(e) => handleTasmiChange(row.riwayatId, e.target.checked)}
                                className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              />
                            </label>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium">Menunggu Nihai</span>
                          )}
                        </td>
                        
                        {mapels.map(m => {
                          if (m.jumlah_tes === 3) {
                            const u1 = getNilaiVal(row, m.id, "u1");
                            const u2 = getNilaiVal(row, m.id, "u2");
                            const n = getNilaiVal(row, m.id, "n");
                            return (
                              <Fragment key={`td_${m.id}`}>
                                <td className="px-1 py-2">
                                  {activeFlags.u1 ? (
                                    <input 
                                      type="number" min={0} max={100} 
                                      value={u1 === null ? "" : u1}
                                      onChange={(e) => handleNilaiChange(row.riwayatId, m.id, "u1", e.target.value === "" ? null : Number(e.target.value))}
                                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center font-bold text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:bg-emerald-50/30 hover:border-slate-300" 
                                    />
                                  ) : (
                                    <div className="w-full rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5 text-center font-bold text-slate-400">{u1 === null ? "-" : u1}</div>
                                  )}
                                </td>
                                <td className="px-1 py-2">
                                  {activeFlags.u2 ? (
                                    <input 
                                      type="number" min={0} max={100} 
                                      value={u2 === null ? "" : u2}
                                      onChange={(e) => handleNilaiChange(row.riwayatId, m.id, "u2", e.target.value === "" ? null : Number(e.target.value))}
                                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center font-bold text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:bg-emerald-50/30 hover:border-slate-300" 
                                    />
                                  ) : (
                                    <div className="w-full rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5 text-center font-bold text-slate-400">{u2 === null ? "-" : u2}</div>
                                  )}
                                </td>
                                <td className="px-1 py-2 border-r border-slate-200">
                                  {activeFlags.u3 ? (
                                    <input 
                                      type="number" min={0} max={100} 
                                      value={n === null ? "" : n}
                                      onChange={(e) => handleNilaiChange(row.riwayatId, m.id, "n", e.target.value === "" ? null : Number(e.target.value))}
                                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center font-bold text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:bg-emerald-50/30 hover:border-slate-300" 
                                    />
                                  ) : (
                                    <div className="w-full rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5 text-center font-bold text-slate-400">{n === null ? "-" : n}</div>
                                  )}
                                </td>
                              </Fragment>
                            );
                          } else {
                            const a = getNilaiVal(row, m.id, "a");
                            return (
                              <td key={`td_${m.id}`} className="px-1 py-2 border-r border-slate-200">
                                <input 
                                  type="number" min={0} max={100} 
                                  value={a === null ? "" : a}
                                  onChange={(e) => handleNilaiChange(row.riwayatId, m.id, "a", e.target.value === "" ? null : Number(e.target.value))}
                                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center font-bold text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:bg-emerald-50/30 hover:border-slate-300" 
                                />
                              </td>
                            );
                          }
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
             <button
              onClick={handleSave}
              disabled={isSaving || Object.keys(changes).length === 0}
              className="rounded-full bg-emerald-600 px-8 py-3 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Menyimpan..." : "Simpan Semua Perubahan"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
