"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, CheckCircle2, ChevronDown, ChevronRight, Save } from "lucide-react";
import toast from "react-hot-toast";

export default function BankSoalPage() {
  const [sesiList, setSesiList] = useState<any[]>([]);
  const [programList, setProgramList] = useState<any[]>([]);
  const [selectedSesi, setSelectedSesi] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  
  const [soalList, setSoalList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSoal, setLoadingSoal] = useState(false);

  // Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importTimpa, setImportTimpa] = useState(false);
  const [importing, setImporting] = useState(false);

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({
    id: "",
    pertanyaan: "",
    urutan: 1,
    jawabanList: [
      { teks: "", isCorrect: false },
      { teks: "", isCorrect: false },
      { teks: "", isCorrect: false },
      { teks: "", isCorrect: false }
    ]
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedSesi && selectedProgram) {
      fetchSoal();
    } else {
      setSoalList([]);
    }
  }, [selectedSesi, selectedProgram]);

  const fetchInitialData = async () => {
    try {
      const [sesiRes, progRes] = await Promise.all([
        fetch("/api/admin/tauzi/sesi"),
        fetch("/api/admin/program") // Asumsikan endpoint ini ada
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

  const fetchSoal = async () => {
    setLoadingSoal(true);
    try {
      const res = await fetch(`/api/admin/tauzi/soal?sesiTauziId=${selectedSesi}&programId=${selectedProgram}`);
      if (res.ok) setSoalList(await res.json());
      else setSoalList([]);
    } catch {
      toast.error("Gagal load soal");
    } finally {
      setLoadingSoal(false);
    }
  };

  const handleCreateNew = () => {
    setFormData({
      id: "",
      pertanyaan: "",
      urutan: soalList.length + 1,
      jawabanList: [
        { teks: "", isCorrect: true },
        { teks: "", isCorrect: false },
        { teks: "", isCorrect: false },
        { teks: "", isCorrect: false }
      ]
    });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleEdit = (soal: any) => {
    setFormData({
      id: soal.id,
      pertanyaan: soal.pertanyaan,
      urutan: soal.urutan,
      // pad with empty answers if less than 4
      jawabanList: [...soal.jawabanList, ...Array(4).fill(null)].slice(0, 4).map((j: any) => j || { teks: "", isCorrect: false })
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleSaveSoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSesi || !selectedProgram) return toast.error("Pilih sesi dan program dulu");
    
    // Validasi
    const hasCorrect = formData.jawabanList.some((j: any) => j.isCorrect);
    if (!hasCorrect) return toast.error("Harus ada 1 jawaban benar!");

    const validJawaban = formData.jawabanList.filter((j: any) => j.teks.trim() !== "");
    if (validJawaban.length < 2) return toast.error("Minimal 2 pilihan jawaban");

    const method = isEditing ? "PUT" : "POST";
    const url = isEditing ? `/api/admin/tauzi/soal/${formData.id}` : "/api/admin/tauzi/soal";

    const payload = {
      sesiTauziId: selectedSesi,
      programId: selectedProgram,
      pertanyaan: formData.pertanyaan,
      urutan: Number(formData.urutan),
      jawabanList: validJawaban
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(isEditing ? "Soal diupdate" : "Soal ditambahkan");
      setIsModalOpen(false);
      fetchSoal();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus soal ini?")) return;
    try {
      const res = await fetch(`/api/admin/tauzi/soal/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Soal dihapus");
      fetchSoal();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile || !selectedSesi || !selectedProgram) return toast.error("File, sesi, dan program wajib diisi.");
    
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      formData.append("sesiTauziId", selectedSesi);
      formData.append("programId", selectedProgram);
      formData.append("timpaSoal", importTimpa.toString());

      const res = await fetch("/api/admin/tauzi/soal/import", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(`Berhasil mengimport ${data.count} soal.`);
      setIsImportModalOpen(false);
      setImportFile(null);
      fetchSoal();
    } catch (err: any) {
      toast.error(err.message || "Gagal import excel");
    } finally {
      setImporting(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display" style={{ color: "var(--color-text)" }}>Bank Soal Tauzi'</h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-subtle)" }}>Kelola soal dan jawaban tes tulis per program dita.</p>
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
          <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-muted)" }}>Program Dita</label>
          <select value={selectedProgram} onChange={e => setSelectedProgram(e.target.value)} className="neu-input w-full py-2.5 text-sm font-semibold">
            {programList.map(p => <option key={p.id} value={p.id}>{p.nama_indo}</option>)}
          </select>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-lg" style={{ color: "var(--color-text)" }}>Daftar Soal ({soalList.length})</h2>
        <div className="flex gap-2">
          <button onClick={() => setIsImportModalOpen(true)} disabled={!selectedSesi || !selectedProgram} className="font-bold text-sm px-4 py-2 bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition-colors flex gap-2 items-center">
            Import Excel
          </button>
          <button onClick={handleCreateNew} disabled={!selectedSesi || !selectedProgram} className="neu-button-primary px-4 py-2 flex items-center justify-center gap-2 rounded-xl text-sm font-bold">
            <Plus size={16}/> Tambah Soal
          </button>
        </div>
      </div>

      {loadingSoal ? (
        <div className="py-8 text-center text-sm" style={{ color: "var(--color-text-subtle)" }}>Memuat soal...</div>
      ) : soalList.length === 0 ? (
        <div className="neu-inset p-8 text-center rounded-2xl">
          <p className="font-semibold" style={{ color: "var(--color-text-subtle)" }}>Tidak ada soal untuk program ini di sesi terpilih.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {soalList.map((soal) => (
            <div key={soal.id} className="neu-card p-5 rounded-2xl transition-all relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 flex gap-2">
                <button onClick={() => handleEdit(soal)} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 transition-colors"><Edit2 size={16}/></button>
                <button onClick={() => handleDelete(soal.id)} className="p-1.5 rounded-lg bg-red-50 text-red-600 transition-colors"><Trash2 size={16}/></button>
              </div>
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: "var(--color-primary-100)", color: "var(--color-primary)" }}>
                  {soal.urutan}
                </div>
                <div className="flex-1 pr-16">
                  <h3 className="font-semibold text-[15px] leading-snug mb-3 whitespace-pre-wrap" style={{ color: "var(--color-text)" }} dangerouslySetInnerHTML={{ __html: soal.pertanyaan }} />
                  <div className="space-y-2">
                    {soal.jawabanList.map((j: any, i: number) => (
                      <div key={j.id} className={`p-2.5 rounded-xl border text-sm flex gap-3 items-center ${j.isCorrect ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center border text-[11px] font-bold ${j.isCorrect ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-gray-500'}`}>
                          {String.fromCharCode(65 + i)}
                        </div>
                        <span className="flex-1 font-medium" style={{ color: j.isCorrect ? '#166534' : 'var(--color-text)' }} dangerouslySetInnerHTML={{ __html: j.teks }} />
                        {j.isCorrect && <CheckCircle2 size={16} className="text-green-500" />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL FORM */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="neu-card rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold mb-4 font-display" style={{ color: "var(--color-text)" }}>
              {isEditing ? "Edit Soal" : "Tambah Soal Baru"}
            </h2>
            <form onSubmit={handleSaveSoal} className="space-y-5">
              <div className="flex gap-4">
                <div className="w-20">
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-muted)" }}>Urutan</label>
                  <input type="number" min="1" required value={formData.urutan} onChange={e => setFormData({ ...formData, urutan: e.target.value })} className="neu-input w-full p-3 text-sm text-center" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-muted)" }}>Pertanyaan</label>
                  <textarea required rows={3} value={formData.pertanyaan} onChange={e => setFormData({ ...formData, pertanyaan: e.target.value })} className="neu-input w-full p-3 text-sm" placeholder="Tuliskan pertanyaan..."></textarea>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-muted)" }}>Pilihan Jawaban (Pilih salah satu sbg benar)</label>
                <div className="space-y-3">
                  {formData.jawabanList.map((j: any, i: number) => (
                    <div key={i} className={`flex items-center gap-3 p-2 rounded-xl transition-colors border ${j.isCorrect ? 'border-[var(--color-primary)] bg-[var(--color-primary-50)]' : 'border-gray-200'}`}>
                      <input 
                        type="radio" 
                        name="correct-answer" 
                        checked={j.isCorrect} 
                        onChange={() => {
                          const newJawaban = formData.jawabanList.map((ans: any, idx: number) => ({ ...ans, isCorrect: idx === i }));
                          setFormData({ ...formData, jawabanList: newJawaban });
                        }}
                        className="w-5 h-5 ml-2 cursor-pointer"
                        style={{ accentColor: "var(--color-primary)" }}
                      />
                      <span className="font-bold text-gray-500 w-6 text-center">{String.fromCharCode(65 + i)}</span>
                      <input 
                        type="text" 
                        required={j.isCorrect || i < 2} // A dan B wajib diisi, yang benar wajib diisi
                        value={j.teks} 
                        onChange={e => {
                          const newJawaban = [...formData.jawabanList];
                          newJawaban[i].teks = e.target.value;
                          setFormData({ ...formData, jawabanList: newJawaban });
                        }} 
                        className="flex-1 bg-transparent border-0 border-b border-gray-300 focus:border-[var(--color-primary)] focus:ring-0 px-2 py-1.5 text-sm font-semibold" 
                        placeholder={`Jawaban ${String.fromCharCode(65 + i)}`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 sticky bottom-0 bg-white">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-sm bg-gray-100 text-gray-700">Batal</button>
                <button type="submit" className="neu-button-primary px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold text-sm">
                  <Save size={16}/> Simpan Soal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL IMPORT EXCEL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="neu-card rounded-2xl w-full max-w-lg overflow-y-auto p-6">
            <h2 className="text-xl font-bold mb-4 font-display" style={{ color: "var(--color-text)" }}>
              Import Soal dari Excel
            </h2>
            <p className="text-sm text-gray-500 mb-4 font-medium">Ubah rich text dan format di excel akan dipertahankan. Unduh template di bawah ini untuk melihat format kolom yang harus digunakan (B. Arab natively didukung xlsx).</p>
            
            <a href="/api/admin/tauzi/soal/template" className="inline-block text-blue-600 font-bold mb-4 hover:underline text-sm uppercase px-3 py-2 bg-blue-50 rounded-lg">
              ↓ Download Template Excel
            </a>

            <form onSubmit={handleImport} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2">Pilih File Excel (.xlsx)</label>
                <input 
                  type="file" 
                  accept=".xlsx,.xls"
                  required 
                  onChange={e => setImportFile(e.target.files?.[0] || null)}
                  className="neu-input w-full p-3 text-sm cursor-pointer" 
                />
              </div>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50">
                <input type="checkbox" checked={importTimpa} onChange={e => setImportTimpa(e.target.checked)} className="rounded" style={{ accentColor: "red" }} />
                <span className="text-sm font-bold text-red-600">Timpa Soal Lama (Menghapus soal lama di program/sesi ini)</span>
              </label>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsImportModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-sm bg-gray-100 text-gray-700">Batal</button>
                <button type="submit" disabled={importing || !importFile} className="px-6 py-2.5 bg-green-600 text-white rounded-xl flex items-center justify-center gap-2 font-bold text-sm hover:bg-green-700">
                  {importing ? "Mengimport..." : "Import Soal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
