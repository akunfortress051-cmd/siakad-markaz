"use client";

import { useState, useEffect } from "react";
import { Loader2, Users, User, Search, CheckSquare, Send, BookOpen } from "lucide-react";

type SantriOption = {
  riwayatId: string;
  nama: string;
  kelasNama: string | null;
  sakan: string;
};

import TataTertibModal from "./tata-tertib-modal";
import TasrihDigital from "./tasrih-digital";
import Swal from "sweetalert2";

export default function PerizinanPublicClient() {
  const [santriOptions, setSantriOptions] = useState<SantriOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("KELUAR_PARE");
  const [mode, setMode] = useState<"INDIVIDU" | "BATCH">("INDIVIDU");
  
  const [search, setSearch] = useState("");
  const [selectedSantri, setSelectedSantri] = useState<SantriOption | null>(null);
  
  const [batchSakan, setBatchSakan] = useState("ALL");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const getTodayWIB = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });

  const [alasan, setAlasan] = useState("");
  const [tanggalMulai, setTanggalMulai] = useState(getTodayWIB());
  const [tanggalSelesai, setTanggalSelesai] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [tasrihData, setTasrihData] = useState<any>(null);
  const [showSOP, setShowSOP] = useState(false);
  const [showAgreement, setShowAgreement] = useState(false);

  useEffect(() => {
    // First-visit gate: show agreement modal if not yet agreed
    const agreed = localStorage.getItem("perizinan_agreed");
    if (!agreed) setShowAgreement(true);

    fetch("/api/public/perizinan")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setSantriOptions(data);
      })
      .catch(() => Swal.fire("Error", "Gagal memuat daftar santri", "error"))
      .finally(() => setIsLoading(false));
  }, []);

  const sakanList = Array.from(new Set(santriOptions.map(s => s.sakan).filter(s => s && s !== "-"))).sort();

  const filteredSantri = santriOptions.filter(s => {
    if (search && !s.nama.toLowerCase().includes(search.toLowerCase())) return false;
    if (mode === "BATCH" && batchSakan !== "ALL" && s.sakan !== batchSakan) return false;
    return true;
  }).slice(0, mode === "INDIVIDU" ? 10 : undefined);

  const toggleBatchSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredSantri.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSantri.map(s => s.riwayatId)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const riwayatIds = mode === "INDIVIDU" 
      ? (selectedSantri ? [selectedSantri.riwayatId] : []) 
      : Array.from(selectedIds);

    if (riwayatIds.length === 0) {
      Swal.fire("Perhatian", "Pilih minimal satu santri", "warning");
      return;
    }

    if (activeTab === "BERHARI_HARI" && (!tanggalMulai || !tanggalSelesai)) {
      Swal.fire("Perhatian", "Pilih tanggal mulai dan sampai", "warning");
      return;
    }

    if (activeTab === "BERHARI_HARI" && new Date(tanggalMulai) > new Date(tanggalSelesai)) {
      Swal.fire("Perhatian", "Tanggal selesai tidak boleh sebelum tanggal mulai", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/public/perizinan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          riwayatIds,
          tipeIzin: activeTab,
          alasan,
          tanggalMulai,
          tanggalSelesai: activeTab === "BERHARI_HARI" ? tanggalSelesai : null
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengirim request");

      const tasrihRes = await fetch(`/api/public/perizinan/tasrih/${data.grupTasrihId}`);
      if (tasrihRes.ok) {
        const fetchedTasrihData = await tasrihRes.json();
        fetchedTasrihData.grupId = data.grupTasrihId;
        setTasrihData(fetchedTasrihData);
      }

      Swal.fire({
        title: "Terkirim!",
        text: "Permohonan izin berhasil dikirim dan tasrih sedang di-download.",
        icon: "success",
        confirmButtonColor: "#059669"
      });

      setIsSuccess(true);
    } catch (error: any) {
      Swal.fire("Gagal", error.message, "error");
      setIsSubmitting(false);
    }
  };

  if (isSuccess && tasrihData) {
    return (
      <div className="py-8 animate-in fade-in zoom-in duration-500 flex flex-col items-center">
        <TasrihDigital data={tasrihData} autoDownload={true} />
        <button 
          onClick={() => {
            setIsSuccess(false);
            setIsSubmitting(false);
            setTasrihData(null);
            setAlasan("");
            setTanggalMulai(getTodayWIB());
            setTanggalSelesai("");
            setSelectedSantri(null);
            setSelectedIds(new Set());
            setSearch("");
          }}
          className="mt-6 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
        >
          Buat Izin Lainnya
        </button>
      </div>
    );
  }

  if (isLoading) {
    return <div className="py-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" /></div>;
  }

  return (
    <>
      {/* First-visit agreement modal */}
      {showAgreement && (
        <TataTertibModal
          requireAgreement={true}
          onClose={() => setShowAgreement(false)}
        />
      )}
      {/* Re-read SOP modal */}
      {showSOP && !showAgreement && (
        <TataTertibModal onClose={() => setShowSOP(false)} />
      )}
      <div className="space-y-6">
        
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowSOP(true)}
            className="text-sm font-bold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1.5"
          >
            <BookOpen size={15} />
            Lihat Tata Tertib Perizinan
          </button>
        </div>

        {/* TABS */}
        <div className="flex gap-2">
          <button 
            type="button"
            onClick={() => setActiveTab("KELUAR_PARE")}
            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === "KELUAR_PARE" ? "bg-[var(--color-primary-100)] text-[var(--color-primary)] shadow-sm border border-[var(--color-primary-100)]" : "text-[var(--color-text-muted)] bg-slate-50 border border-slate-200 hover:bg-slate-100"}`}
          >
            Izin Keluar Pare
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab("BERHARI_HARI")}
            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === "BERHARI_HARI" ? "bg-[var(--color-primary-100)] text-[var(--color-primary)] shadow-sm border border-[var(--color-primary-100)]" : "text-[var(--color-text-muted)] bg-slate-50 border border-slate-200 hover:bg-slate-100"}`}
          >
            Izin Berhari-hari
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* SANTRI SELECTION */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-bold text-[var(--color-text)]">1. Pilih Santri</label>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button type="button" onClick={() => setMode("INDIVIDU")} className={`px-3 py-1 text-xs font-bold rounded-md flex items-center gap-1.5 transition-all ${mode === "INDIVIDU" ? "bg-white shadow-sm text-[var(--color-primary)]" : "text-[var(--color-text-muted)]"}`}>
                  <User size={14} /> Individu
                </button>
                <button type="button" onClick={() => setMode("BATCH")} className={`px-3 py-1 text-xs font-bold rounded-md flex items-center gap-1.5 transition-all ${mode === "BATCH" ? "bg-white shadow-sm text-[var(--color-primary)]" : "text-[var(--color-text-muted)]"}`}>
                  <Users size={14} /> Batch
                </button>
              </div>
            </div>

            {mode === "INDIVIDU" ? (
              <div className="relative">
                {!selectedSantri ? (
                  <>
                    <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Ketik nama santri..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] text-base shadow-sm"
                    />
                    {search && (
                      <div className="absolute z-20 w-full mt-2 bg-white border border-slate-200 shadow-xl rounded-xl max-h-60 overflow-y-auto">
                        {filteredSantri.map(s => (
                          <button
                            key={s.riwayatId}
                            type="button"
                            onClick={() => { setSelectedSantri(s); setSearch(""); }}
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 flex justify-between items-center"
                          >
                            <div>
                              <div className="font-bold text-slate-800">{s.nama}</div>
                              <div className="text-xs text-slate-500 mt-0.5">{s.kelasNama || "Tanpa Kelas"}</div>
                            </div>
                            <div className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded">{s.sakan}</div>
                          </button>
                        ))}
                        {filteredSantri.length === 0 && <div className="px-4 py-4 text-center text-slate-500">Santri tidak ditemukan</div>}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-between p-4 border-2 border-[var(--color-primary)] bg-[var(--color-primary-50)] rounded-xl shadow-sm">
                    <div>
                      <div className="font-black text-lg text-[var(--color-primary-dark)]">{selectedSantri.nama}</div>
                      <div className="text-sm text-[var(--color-primary)] font-medium mt-1">{selectedSantri.kelasNama || "Tanpa Kelas"} • {selectedSantri.sakan}</div>
                    </div>
                    <button type="button" onClick={() => setSelectedSantri(null)} className="text-sm font-bold px-3 py-2 bg-white rounded-lg text-red-500 shadow-sm hover:bg-red-50">Ganti</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex gap-2">
                  <select value={batchSakan} onChange={(e) => setBatchSakan(e.target.value)} className="w-1/2 px-3 py-2.5 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
                    <option value="ALL">Semua Sakan</option>
                    {sakanList.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <div className="relative w-1/2">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input type="text" placeholder="Cari nama..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
                  </div>
                </div>

                <div className="bg-white border border-slate-300 rounded-xl overflow-hidden flex flex-col h-[250px]">
                  <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-600">{selectedIds.size} dipilih</span>
                    <button type="button" onClick={handleSelectAll} className="text-sm font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1">
                      <CheckSquare size={16} /> Pilih Semua
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-1">
                    {filteredSantri.map(s => (
                      <label key={s.riwayatId} className="flex items-center gap-4 px-3 py-2.5 hover:bg-slate-50 rounded-lg cursor-pointer border-b border-slate-50 last:border-0">
                        <input 
                          type="checkbox" 
                          checked={selectedIds.has(s.riwayatId)}
                          onChange={() => toggleBatchSelect(s.riwayatId)}
                          className="w-5 h-5 rounded border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                        />
                        <div className="flex-1">
                          <div className="font-bold text-sm text-slate-800">{s.nama}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{s.kelasNama || "Tanpa Kelas"} • {s.sakan}</div>
                        </div>
                      </label>
                    ))}
                    {filteredSantri.length === 0 && <div className="p-6 text-center text-slate-400">Tidak ada santri yang cocok</div>}
                  </div>
                </div>
              </div>
            )}
          </div>

          <hr className="border-slate-200" />

          {/* FORM DETAILS */}
          <div className="space-y-4">
            <label className="block text-sm font-bold text-[var(--color-text)]">2. Detail Izin</label>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Alasan Izin</label>
              <textarea 
                required
                value={alasan}
                onChange={(e) => setAlasan(e.target.value)}
                placeholder="Contoh: Mengurus KTP, Menjenguk orang tua sakit..."
                rows={3}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] text-base resize-none shadow-sm"
              />
            </div>

            {activeTab === "BERHARI_HARI" ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Dari Tanggal</label>
                  <input type="date" required value={tanggalMulai} onChange={(e) => setTanggalMulai(e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] text-sm font-bold shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Sampai Tanggal</label>
                  <input type="date" required value={tanggalSelesai} onChange={(e) => setTanggalSelesai(e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] text-sm font-bold shadow-sm" />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Tanggal Izin</label>
                <input type="date" required value={tanggalMulai} onChange={(e) => setTanggalMulai(e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] text-sm font-bold shadow-sm" />
              </div>
            )}
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting || (mode === "INDIVIDU" && !selectedSantri) || (mode === "BATCH" && selectedIds.size === 0)}
            className="w-full mt-8 flex items-center justify-center gap-2 bg-[var(--color-primary)] text-white px-4 py-4 rounded-xl text-base font-black tracking-wide hover:bg-[var(--color-primary-dark)] transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:shadow-none disabled:hover:translate-y-0 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : <Send className="h-6 w-6" />}
            {isSubmitting ? "MENGIRIM..." : "KIRIM PERMOHONAN IZIN"}
          </button>
        </form>
      </div>
    </>
  );
}
