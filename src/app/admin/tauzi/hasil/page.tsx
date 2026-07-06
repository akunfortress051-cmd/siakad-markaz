"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Download } from "lucide-react";

export default function HasilTauziPage() {
  const [sesiList, setSesiList] = useState<any[]>([]);
  const [programList, setProgramList] = useState<any[]>([]);
  const [selectedSesi, setSelectedSesi] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  
  const [pesertaList, setPesertaList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedSesi) {
      fetchPeserta();
    }
  }, [selectedSesi, selectedProgram]);

  const fetchInitialData = async () => {
    try {
      const [sesiRes, progRes] = await Promise.all([
        fetch("/api/admin/tauzi/sesi"),
        fetch("/api/admin/program")
      ]);
      const sesiData = await sesiRes.json();
      const progData = await progRes.json();
      setSesiList(sesiData || []);
      setProgramList(progData || []);
      
      const activeSesi = sesiData?.find((s: any) => s.isActive);
      if (activeSesi) setSelectedSesi(activeSesi.id);
      else if (sesiData?.length > 0) setSelectedSesi(sesiData[0].id);
      
    } catch {
      toast.error("Gagal load initial data");
    } finally {
      setLoading(false);
    }
  };

  const fetchPeserta = async () => {
    setLoadingData(true);
    try {
      // Jika program null, ambil semua
      const url = selectedProgram 
        ? `/api/admin/tauzi/peserta?sesiTauziId=${selectedSesi}&programId=${selectedProgram}`
        : `/api/admin/tauzi/peserta?sesiTauziId=${selectedSesi}`;
      const res = await fetch(url);
      if (res.ok) setPesertaList(await res.json());
      else setPesertaList([]);
    } catch {
      toast.error("Gagal load data peserta");
    } finally {
      setLoadingData(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display" style={{ color: "var(--color-text)" }}>Laporan Hasil Tauzi'</h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-subtle)" }}>Lihat rekapitulasi nilai dan rekomendasi program santri.</p>
        </div>
        <button 
          onClick={() => {
            alert("Fitur export akan membuka CSV.");
          }}
          className="neu-button font-bold text-sm px-4 py-2 rounded-xl flex items-center gap-2"
        >
          <Download size={16} /> Export Data
        </button>
      </div>

      <div className="neu-card rounded-2xl p-4 mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-muted)" }}>Sesi Tauzi'</label>
          <select value={selectedSesi} onChange={e => setSelectedSesi(e.target.value)} className="neu-input w-full py-2.5 text-sm font-semibold">
            {sesiList.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-muted)" }}>Filter Program Asal</label>
          <select value={selectedProgram} onChange={e => setSelectedProgram(e.target.value)} className="neu-input w-full py-2.5 text-sm font-semibold">
            <option value="">-- Semua Program --</option>
            {programList.map(p => <option key={p.id} value={p.id}>{p.nama_indo}</option>)}
          </select>
        </div>
      </div>

      <div className="neu-card rounded-2xl p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase" style={{ background: "var(--color-surface-hover)", color: "var(--color-text-subtle)" }}>
              <tr>
                <th className="px-6 py-4 font-bold rounded-tl-2xl">Santri</th>
                <th className="px-6 py-4 font-bold">Prog. Pilihan</th>
                <th className="px-6 py-4 font-bold text-center">N. Syafawi</th>
                <th className="px-6 py-4 font-bold text-center">N. Muqobalah</th>
                <th className="px-6 py-4 font-bold bg-green-50/50">Prog. Rekomendasi</th>
                <th className="px-6 py-4 font-bold rounded-tr-2xl">Penyimak</th>
              </tr>
            </thead>
            <tbody>
              {loadingData ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Memuat data...</td></tr>
              ) : pesertaList.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Tidak ada data.</td></tr>
              ) : (
                pesertaList.map((p) => {
                  return (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors" style={{ borderColor: "var(--color-surface-hover)" }}>
                      <td className="px-6 py-4">
                        <div className="font-bold whitespace-nowrap" style={{ color: "var(--color-text)" }}>{p.santri.nama}</div>
                        <div className="text-[11px] font-semibold tracking-wider text-gray-400 mt-0.5">{p.santri.id}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 font-medium">{p.program?.nama_indo || '-'}</td>
                      <td className="px-6 py-4 text-center">
                        {p.nilaiSyafawi !== null ? (
                          <span className="font-bold">{p.nilaiSyafawi}</span>
                        ) : (
                          <span className="text-[11px] text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {p.nilaiMuqobalah !== null ? (
                          <span className="font-bold">{p.nilaiMuqobalah}</span>
                        ) : (
                          <span className="text-[11px] text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 bg-green-50/30">
                        {p.programRekomendasi ? (
                          <span className="font-bold text-green-700">{p.programRekomendasi.nama_indo}</span>
                        ) : (
                          <span className="text-gray-400 italic">Belum ditentukan</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600 italic">
                        {p.penyimakNama || '-'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
