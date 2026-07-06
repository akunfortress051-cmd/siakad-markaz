"use client";

import { useState, useEffect } from "react";
import { Save, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";

export default function InputNilaiTauziPage() {
  const [sesiList, setSesiList] = useState<any[]>([]);
  const [programList, setProgramList] = useState<any[]>([]);
  const [selectedSesi, setSelectedSesi] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  
  const [pesertaList, setPesertaList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  // States to keep track of changes
  const [editedData, setEditedData] = useState<{ [id: string]: any }>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedSesi && selectedProgram) {
      fetchPeserta();
    } else {
      setPesertaList([]);
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
      
      if (progData?.length > 0) setSelectedProgram(progData[0].id);
    } catch {
      toast.error("Gagal load initial data");
    } finally {
      setLoading(false);
    }
  };

  const fetchPeserta = async () => {
    setLoadingData(true);
    try {
      const res = await fetch(`/api/admin/tauzi/peserta?sesiTauziId=${selectedSesi}&programId=${selectedProgram}`);
      if (res.ok) {
        const data = await res.json();
        setPesertaList(data);
        setEditedData({});
      } else {
        setPesertaList([]);
      }
    } catch {
      toast.error("Gagal load data peserta");
    } finally {
      setLoadingData(false);
    }
  };

  const handleInputChange = (id: string, field: string, value: any) => {
    setEditedData(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [field]: value
      }
    }));
  };

  const handleSaveNilai = async (pesertaId: string) => {
    const dataToSave = editedData[pesertaId];
    if (!dataToSave) return; // tidak ada perubahan

    setSavingId(pesertaId);
    try {
      // Dapatkan data eksisting untuk field yang tidak diubah
      const existing = pesertaList.find(p => p.id === pesertaId);
      const payload = {
        id: pesertaId,
        nilaiMuqobalah: dataToSave.nilaiMuqobalah !== undefined ? dataToSave.nilaiMuqobalah : existing.nilaiMuqobalah,
        programRekomendasiId: dataToSave.programRekomendasiId !== undefined ? dataToSave.programRekomendasiId : existing.programRekomendasiId,
        penyimakNama: dataToSave.penyimakNama !== undefined ? dataToSave.penyimakNama : existing.penyimakNama,
      };

      const res = await fetch("/api/admin/tauzi/nilai", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error((await res.json()).error);
      
      toast.success("Tersimpan");
      // Update local state by re-fetching
      fetchPeserta();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan");
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display" style={{ color: "var(--color-text)" }}>Input Nilai Muqobalah</h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-subtle)" }}>Masukkan nilai tes lisan dan rekomendasi kelas.</p>
        </div>
      </div>

      <div className="neu-card rounded-2xl p-4 mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-muted)" }}>Sesi Tauzi'</label>
          <select value={selectedSesi} onChange={e => setSelectedSesi(e.target.value)} className="neu-input w-full py-2.5 text-sm font-semibold">
            {sesiList.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-muted)" }}>Program Asal (Pilihan)</label>
          <select value={selectedProgram} onChange={e => setSelectedProgram(e.target.value)} className="neu-input w-full py-2.5 text-sm font-semibold">
            {programList.map(p => <option key={p.id} value={p.id}>{p.nama_indo}</option>)}
          </select>
        </div>
      </div>

      <div className="neu-card rounded-2xl p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase" style={{ background: "var(--color-surface-hover)", color: "var(--color-text-subtle)" }}>
              <tr>
                <th className="px-4 py-4 font-bold rounded-tl-2xl w-12 text-center">No</th>
                <th className="px-4 py-4 font-bold">Santri</th>
                <th className="px-4 py-4 font-bold text-center w-28">N. Syafawi</th>
                <th className="px-4 py-4 font-bold text-center w-32">N. Muqobalah</th>
                <th className="px-4 py-4 font-bold w-48">Rekomendasi</th>
                <th className="px-4 py-4 font-bold w-40">Penyimak</th>
                <th className="px-4 py-4 font-bold text-center rounded-tr-2xl w-24">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loadingData ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">Memuat data...</td></tr>
              ) : pesertaList.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">Tidak ada santri yang mengambil ujian di program/sesi ini.</td></tr>
              ) : (
                pesertaList.map((p, idx) => {
                  const edited = editedData[p.id];
                  const hasChanges = edited !== undefined;
                  const currentMuqobalah = edited?.nilaiMuqobalah !== undefined ? edited.nilaiMuqobalah : (p.nilaiMuqobalah ?? "");
                  const currentRek = edited?.programRekomendasiId !== undefined ? edited.programRekomendasiId : (p.programRekomendasiId ?? p.programId);
                  const currentPenyimak = edited?.penyimakNama !== undefined ? edited.penyimakNama : (p.penyimakNama ?? "");

                  return (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors" style={{ borderColor: "var(--color-surface-hover)" }}>
                      <td className="px-4 py-4 text-center font-medium text-gray-500">{idx + 1}</td>
                      <td className="px-4 py-4">
                        <div className="font-bold whitespace-nowrap" style={{ color: "var(--color-text)" }}>{p.santri.nama}</div>
                        <div className="text-[11px] font-semibold tracking-wider text-gray-400 mt-0.5">{p.santri.id}</div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {p.sudahUjian ? (
                          <span className="font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-200">{p.nilaiSyafawi}</span>
                        ) : (
                          <span className="text-[11px] text-gray-400 font-semibold bg-gray-100 px-2 py-1 rounded-md">Belum Ujian</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <input 
                          type="number" max={100} min={0} 
                          className="neu-input w-full p-2 text-center text-sm font-bold placeholder-gray-300"
                          placeholder="0-100"
                          value={currentMuqobalah}
                          onChange={(e) => handleInputChange(p.id, "nilaiMuqobalah", e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <select 
                          className="neu-input w-full p-2 text-xs font-semibold"
                          value={currentRek}
                          onChange={(e) => handleInputChange(p.id, "programRekomendasiId", e.target.value)}
                        >
                          <option value="">-- Kosong --</option>
                          {programList.map(prog => <option key={prog.id} value={prog.id}>{prog.nama_indo}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input 
                          type="text" 
                          className="neu-input w-full p-2 text-xs font-semibold placeholder-gray-300"
                          placeholder="Nama Ustadz..."
                          value={currentPenyimak}
                          onChange={(e) => handleInputChange(p.id, "penyimakNama", e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button 
                          disabled={!hasChanges || savingId === p.id}
                          onClick={() => handleSaveNilai(p.id)}
                          className={`p-2 rounded-xl transition-all ${hasChanges ? 'bg-[var(--color-primary)] text-white shadow-md' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                        >
                          {savingId === p.id ? <span className="animate-spin text-white">⚙</span> : (hasChanges ? <Save size={16}/> : <CheckCircle2 size={16}/>)}
                        </button>
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
