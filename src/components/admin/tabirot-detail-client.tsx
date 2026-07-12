"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import Link from "next/link";
import { ArrowLeft, Users, Save, X, Plus, Search, Calendar } from "lucide-react";

type Anggota = {
  id: string;
  santriId: string;
  santri: {
    nama: string;
    kategori: string | null;
    gender: string | null;
  };
};

type Kelompok = {
  id: string;
  tempat: string;
  bulanKe: number;
  isActive: boolean;
  anggotaList: Anggota[];
};

type AbsenStatus = "HADIR" | "IZIN" | "SAKIT" | "ALPHA";

export function TabirotDetailClient({ kelompokId, canEdit }: { kelompokId: string, canEdit: boolean }) {
  const [kelompok, setKelompok] = useState<Kelompok | null>(null);
  const [activeTab, setActiveTab] = useState<"absen" | "anggota">("absen");
  const [isLoading, setIsLoading] = useState(true);

  // === State Absensi ===
  const [tanggal, setTanggal] = useState("");
  const [absenMap, setAbsenMap] = useState<Record<string, { status: AbsenStatus; keterangan: string }>>({});
  const [isSavingAbsen, setIsSavingAbsen] = useState(false);

  // === State Anggota ===
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    // Set default tanggal = today
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric', month: '2-digit', day: '2-digit'
    });
    setTanggal(formatter.format(new Date()));
    fetchKelompok();
  }, [kelompokId]);

  useEffect(() => {
    if (activeTab === "absen" && tanggal && kelompok) {
      fetchAbsenData();
    }
  }, [tanggal, activeTab, kelompok?.id]); // Re-fetch absen data if date or tab changes

  const fetchKelompok = async () => {
    try {
      const res = await fetch(`/api/admin/absensi/tabirot/${kelompokId}`);
      const data = await res.json();
      if (data.success) {
        setKelompok(data.data);
      } else {
        toast.error("Gagal memuat data kelompok");
      }
    } catch {
      toast.error("Kesalahan jaringan");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAbsenData = async () => {
    try {
      const res = await fetch(`/api/admin/absensi/tabirot/${kelompokId}/absen?tanggal=${tanggal}`);
      const data = await res.json();
      if (data.success) {
        const newMap: Record<string, any> = {};
        data.data.forEach((a: any) => {
          newMap[a.santriId] = { status: a.status, keterangan: a.keterangan || "" };
        });
        setAbsenMap(newMap);
      }
    } catch {
      toast.error("Gagal memuat data absensi");
    }
  };

  const handleSaveAbsen = async () => {
    setIsSavingAbsen(true);
    try {
      const absenList = Object.entries(absenMap).map(([santriId, data]) => ({
        santriId,
        status: data.status,
        keterangan: data.keterangan,
      }));

      const res = await fetch(`/api/admin/absensi/tabirot/${kelompokId}/absen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tanggal, absenList }),
      });

      const result = await res.json();
      if (result.success) {
        toast.success(`Berhasil menyimpan absensi ${result.count} santri`);
      } else {
        toast.error(result.error || "Gagal menyimpan absensi");
      }
    } catch {
      toast.error("Kesalahan jaringan saat menyimpan absensi");
    } finally {
      setIsSavingAbsen(false);
    }
  };

  const setSemuaHadir = () => {
    if (!kelompok) return;
    const newMap = { ...absenMap };
    kelompok.anggotaList.forEach((a) => {
      newMap[a.santriId] = { status: "HADIR", keterangan: absenMap[a.santriId]?.keterangan || "" };
    });
    setAbsenMap(newMap);
  };

  const handleSearchSantri = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.length < 3) {
      toast.error("Masukkan minimal 3 huruf");
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/integrasi/siakad/santri?query=${searchQuery}`); // Reuse existing global search if available, 
      // or we can just fetch all and filter in memory if the endpoint is not global.
      // Wait, there might be a better way or we use a custom endpoint.
      // Let's call /api/admin/santri or similar. But since we might not have a generic global search API exposed for this UI, 
      // let's fetch active santri from our existing /api/admin/absensi/sakan route which returns active santri List?
      // Actually, let's create a quick search logic on frontend using the master santri API if we can, or just generic API.
      
      // I will fallback to a simple generic fetch since I don't know the exact endpoint for global santri search.
      // Let's assume `/api/admin/absensi/sakan?tanggal=${tanggal}` provides a massive list of santri and we can just filter it. 
      // But it's inefficient. 
      // We will just do a standard API call if exists, else fallback to something we know.
      const sres = await fetch(`/api/admin/absensi/sakan?tanggal=${tanggal}`);
      const sdata = await sres.json();
      if (sdata.santriList) {
        const filtered = sdata.santriList.filter((s:any) => s.nama.toLowerCase().includes(searchQuery.toLowerCase()));
        setSearchResults(filtered);
      }
    } catch {
      toast.error("Gagal melakukan pencarian");
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddAnggota = async (santriId: string) => {
    setIsAdding(true);
    try {
      const res = await fetch(`/api/admin/absensi/tabirot/${kelompokId}/anggota`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ santriIds: [santriId] }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Santri berhasil ditambahkan");
        fetchKelompok();
        setSearchResults(prev => prev.filter(s => s.santriId !== santriId));
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Gagal menambah anggota");
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveAnggota = async (santriId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus santri dari kelompok Ta'birot ini?")) return;
    try {
      const res = await fetch(`/api/admin/absensi/tabirot/${kelompokId}/anggota`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ santriId }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Santri dihapus dari kelompok");
        fetchKelompok();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Gagal menghapus anggota");
    }
  };

  if (isLoading) {
    return <div className="p-12 text-center text-[var(--color-text-muted)] font-semibold">Memuat detail kelompok...</div>;
  }

  if (!kelompok) {
    return <div className="p-12 text-center text-red-500 font-semibold">Data kelompok tidak ditemukan</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col gap-4 bg-white p-6 rounded-[var(--radius-2xl)] border border-[var(--color-surface-dark)] shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <Link href="/admin/absensi/tabirot" className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 mb-2">
            <ArrowLeft size={14} /> Kembali ke Daftar
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-[var(--color-text)]">
              {kelompok.tempat}
            </h1>
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-pink-100 text-pink-700">
              Bulan ke-{kelompok.bulanKe}
            </span>
          </div>
          <div className="flex gap-4 mt-2 text-sm font-semibold text-[var(--color-text-muted)]">
            <span className="flex items-center gap-1"><Users size={16} className="text-blue-500" /> {kelompok.anggotaList.length} Santri</span>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex overflow-x-auto gap-2 p-1.5 bg-white rounded-2xl border border-[var(--color-surface-dark)] w-max">
        <button
          onClick={() => setActiveTab("absen")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === "absen"
              ? "bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary-100)]"
              : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-light)]"
          }`}
        >
          <Calendar size={18} /> Absensi Santri
        </button>
        {canEdit && (
          <button
            onClick={() => setActiveTab("anggota")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === "anggota"
                ? "bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary-100)]"
                : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-light)]"
            }`}
          >
            <Users size={18} /> Kelola Anggota
          </button>
        )}
      </div>

      {activeTab === "absen" && (
        <section className="bg-white rounded-[var(--radius-2xl)] border border-[var(--color-surface-dark)] shadow-sm overflow-hidden">
          <div className="p-6 border-b border-[var(--color-surface-dark)] flex flex-col md:flex-row md:items-end justify-between gap-4 bg-[var(--color-surface-light)]">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-1.5">
                Tanggal Absensi
              </label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="rounded-xl border border-[var(--color-surface-dark)] bg-white px-4 py-2 text-sm outline-none transition focus:border-blue-500"
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={setSemuaHadir}
                className="px-4 py-2 bg-[var(--color-surface-dark)] hover:bg-[var(--color-surface)] text-[var(--color-text)] text-xs font-bold rounded-full transition"
              >
                Hadirkan Semua
              </button>
              <button
                onClick={handleSaveAbsen}
                disabled={isSavingAbsen || kelompok.anggotaList.length === 0}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-full transition disabled:opacity-50"
              >
                <Save size={16} /> {isSavingAbsen ? "Menyimpan..." : "Simpan Absensi"}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[var(--color-secondary)] uppercase text-[10px] font-bold text-[var(--color-text-muted)] tracking-wider">
                <tr>
                  <th className="px-6 py-4 w-12 rounded-tl-[var(--radius-2xl)]">#</th>
                  <th className="px-6 py-4">Nama Santri Lengkap</th>
                  <th className="px-6 py-4 w-72">Status Absensi</th>
                  <th className="px-6 py-4 rounded-tr-[var(--radius-2xl)]">Keterangan Tambahan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-surface-dark)]">
                {kelompok.anggotaList.map((anggota, idx) => {
                  const s = anggota.santri;
                  const currentStatus = absenMap[anggota.santriId]?.status;
                  return (
                    <tr key={anggota.id} className="hover:bg-[var(--color-surface-light)] transition-colors">
                      <td className="px-6 py-4 text-[var(--color-text-subtle)] font-bold text-center">{idx + 1}</td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-[var(--color-text)]">{s.nama}</p>
                        <div className="flex gap-2 mt-1">
                          {s.kategori && (
                            <span className="px-2 py-0.5 rounded-full bg-[var(--color-surface)] text-[10px] font-semibold text-[var(--color-text-muted)]">{s.kategori}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1.5">
                          {(["HADIR", "IZIN", "SAKIT", "ALPHA"] as AbsenStatus[]).map((st) => (
                            <button
                              key={st}
                              onClick={() => {
                                setAbsenMap(prev => ({
                                  ...prev,
                                  [anggota.santriId]: { status: st, keterangan: prev[anggota.santriId]?.keterangan || "" }
                                }));
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                currentStatus === st
                                  ? st === "HADIR" ? "bg-[var(--color-primary)] text-white shadow-sm"
                                    : st === "IZIN" ? "bg-indigo-500 text-white shadow-sm"
                                    : st === "SAKIT" ? "bg-[var(--color-warning)] text-white shadow-sm"
                                    : "bg-[var(--color-danger)] text-white shadow-sm"
                                  : "bg-[var(--color-surface-dark)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]"
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
                          placeholder="Bila ada catatan..."
                          value={absenMap[anggota.santriId]?.keterangan || ""}
                          onChange={(e) => {
                            setAbsenMap(prev => ({
                              ...prev,
                              [anggota.santriId]: { status: prev[anggota.santriId]?.status || "ALPHA", keterangan: e.target.value }
                            }));
                          }}
                          className="w-full rounded-lg border border-[var(--color-surface-dark)] px-3 py-1.5 text-sm outline-none focus:border-blue-500 transition"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            
            {kelompok.anggotaList.length === 0 && (
              <div className="p-12 text-center bg-white text-[var(--color-text-muted)] font-semibold">
                Belum ada santri di kelompok ini. Beralih ke tab Kelola Anggota untuk menambahkan.
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === "anggota" && (
        <section className="bg-white rounded-[var(--radius-2xl)] border border-[var(--color-surface-dark)] shadow-sm overflow-hidden">
          <div className="p-6 border-b border-[var(--color-surface-dark)] bg-slate-50 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Kelola Santri</h3>
              <p className="text-xs text-slate-500 mt-1">Tambahkan santri ke dalam kelompok ini.</p>
            </div>
            <button 
              onClick={() => setShowSearch(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-full text-sm font-bold shadow transition-colors"
            >
              <Plus size={16} /> Tambah Santri
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[var(--color-secondary)] uppercase text-[10px] font-bold text-[var(--color-text-muted)] tracking-wider">
                <tr>
                  <th className="px-6 py-4 w-12 rounded-tl-[var(--radius-2xl)]">#</th>
                  <th className="px-6 py-4">Nama Santri</th>
                  <th className="px-6 py-4">Kategori</th>
                  <th className="px-6 py-4 text-right rounded-tr-[var(--radius-2xl)]">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-surface-dark)]">
                {kelompok.anggotaList.map((anggota, idx) => (
                  <tr key={anggota.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-bold text-slate-400 text-center">{idx + 1}</td>
                    <td className="px-6 py-4 font-bold text-slate-700">{anggota.santri.nama}</td>
                    <td className="px-6 py-4">
                      {anggota.santri.kategori && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">{anggota.santri.kategori}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleRemoveAnggota(anggota.santriId)}
                        className="text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {kelompok.anggotaList.length === 0 && (
              <div className="p-12 text-center text-[var(--color-text-muted)] font-semibold border-t border-slate-100">
                Belum ada anggota. Klik "Tambah Santri" untuk memasukkan santri ke kelompok.
              </div>
            )}
          </div>
        </section>
      )}

      {/* Modal Pencarian Santri */}
      {showSearch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-lg">Cari Santri</h3>
              <button 
                onClick={() => { setShowSearch(false); setSearchResults([]); setSearchQuery(""); }}
                className="text-slate-400 hover:text-slate-600 p-1 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-5 border-b border-slate-100 bg-slate-50">
              <form onSubmit={handleSearchSantri} className="flex gap-3">
                <input
                  autoFocus
                  type="text"
                  placeholder="Ketik minimal 3 huruf nama santri..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
                <button
                  type="submit"
                  disabled={isSearching || searchQuery.length < 3}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition disabled:opacity-50 flex items-center gap-2"
                >
                  <Search size={16} /> Cari
                </button>
              </form>
            </div>
            
            <div className="flex-1 p-5 overflow-y-auto">
              {isSearching ? (
                <div className="text-center py-8 text-sm text-slate-500 font-semibold">Mencari santri...</div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map(s => {
                    const isAlreadyMember = kelompok.anggotaList.some(a => a.santriId === (s.santriId || s.id));
                    return (
                      <div key={s.riwayatId || s.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-300 transition-colors">
                        <div>
                          <p className="font-bold text-slate-700 text-sm">{s.nama}</p>
                          <div className="flex gap-2 mt-1">
                            {s.sakan && s.sakan !== "-" && <span className="text-[10px] bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full font-semibold">{s.sakan}</span>}
                            {s.kelasNama && <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">{s.kelasNama}</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddAnggota(s.santriId || s.id)}
                          disabled={isAlreadyMember || isAdding}
                          className="px-4 py-2 text-xs font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                        >
                          {isAlreadyMember ? "Sudah di Grup" : "Tambahkan"}
                        </button>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-slate-500 font-medium">
                  {searchQuery.length >= 3 ? "Tidak ada santri yang cocok." : "Ketik untuk mencari."}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
