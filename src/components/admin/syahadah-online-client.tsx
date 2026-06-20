"use client";

import { useState, useEffect, useCallback } from "react";
import { Settings, Plus, Trash2, Edit3, Printer, Search, X } from "lucide-react";
import toast from "react-hot-toast";

type ProgramOnline = {
  id: string;
  namaIndo: string;
  namaArab: string;
  tglCetakArab: string | null;
  periodeAwal: string | null;
  periodeAkhir: string | null;
  _count?: { syahadahList: number };
};

type SyahadahOnline = {
  id: string;
  nama: string;
  programOnlineId: string | null;
  isMusyarokah: boolean;
  nilai: number | null;
  createdAt: string;
  programOnline: ProgramOnline | null;
};

export function SyahadahOnlineClient() {
  const [activeTab, setActiveTab] = useState<"data" | "program">("data");
  const [programs, setPrograms] = useState<ProgramOnline[]>([]);
  const [records, setRecords] = useState<SyahadahOnline[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Form state for adding/editing records
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SyahadahOnline | null>(null);
  const [formNama, setFormNama] = useState("");
  const [formProgramId, setFormProgramId] = useState("");
  const [formIsMusyarokah, setFormIsMusyarokah] = useState(false);
  const [formNilai, setFormNilai] = useState("");

  // Form state for adding/editing programs
  const [showProgramForm, setShowProgramForm] = useState(false);
  const [editingProgram, setEditingProgram] = useState<ProgramOnline | null>(null);
  const [progNamaIndo, setProgNamaIndo] = useState("");
  const [progNamaArab, setProgNamaArab] = useState("");
  const [progTglCetak, setProgTglCetak] = useState("");
  const [progPeriodeAwal, setProgPeriodeAwal] = useState("");
  const [progPeriodeAkhir, setProgPeriodeAkhir] = useState("");

  const fetchPrograms = useCallback(async () => {
    const res = await fetch("/api/admin/program-online");
    if (res.ok) setPrograms(await res.json());
  }, []);

  const fetchRecords = useCallback(async () => {
    const res = await fetch("/api/admin/syahadah-online");
    if (res.ok) setRecords(await res.json());
  }, []);

  useEffect(() => {
    Promise.all([fetchPrograms(), fetchRecords()]).finally(() => setLoading(false));
  }, [fetchPrograms, fetchRecords]);

  // ─── PROGRAM CRUD ─────────────────────────────────────────────
  const resetProgramForm = () => {
    setShowProgramForm(false);
    setEditingProgram(null);
    setProgNamaIndo("");
    setProgNamaArab("");
    setProgTglCetak("");
    setProgPeriodeAwal("");
    setProgPeriodeAkhir("");
  };

  const openEditProgram = (p: ProgramOnline) => {
    setEditingProgram(p);
    setProgNamaIndo(p.namaIndo);
    setProgNamaArab(p.namaArab);
    setProgTglCetak(p.tglCetakArab || "");
    setProgPeriodeAwal(p.periodeAwal || "");
    setProgPeriodeAkhir(p.periodeAkhir || "");
    setShowProgramForm(true);
  };

  const handleSaveProgram = async () => {
    if (!progNamaIndo || !progNamaArab) {
      toast.error("Nama Indo dan Arab wajib diisi");
      return;
    }

    const payload = {
      ...(editingProgram ? { id: editingProgram.id } : {}),
      namaIndo: progNamaIndo,
      namaArab: progNamaArab,
      tglCetakArab: progTglCetak || null,
      periodeAwal: progPeriodeAwal || null,
      periodeAkhir: progPeriodeAkhir || null,
    };

    const res = await fetch("/api/admin/program-online", {
      method: editingProgram ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      toast.success(editingProgram ? "Program diperbarui" : "Program ditambahkan");
      resetProgramForm();
      fetchPrograms();
    } else {
      const err = await res.json();
      toast.error(err.error || "Gagal menyimpan");
    }
  };

  const handleDeleteProgram = async (id: string) => {
    if (!confirm("Hapus program ini?")) return;
    const res = await fetch(`/api/admin/program-online?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Program dihapus");
      fetchPrograms();
      fetchRecords();
    } else {
      toast.error("Gagal menghapus program");
    }
  };

  // ─── RECORD CRUD ──────────────────────────────────────────────
  const resetRecordForm = () => {
    setShowRecordForm(false);
    setEditingRecord(null);
    setFormNama("");
    setFormProgramId("");
    setFormIsMusyarokah(false);
    setFormNilai("");
  };

  const openEditRecord = (r: SyahadahOnline) => {
    setEditingRecord(r);
    setFormNama(r.nama);
    setFormProgramId(r.programOnlineId || "");
    setFormIsMusyarokah(r.isMusyarokah);
    setFormNilai(r.nilai !== null ? String(r.nilai) : "");
    setShowRecordForm(true);
  };

  const handleSaveRecord = async () => {
    if (!formNama) {
      toast.error("Nama wajib diisi");
      return;
    }
    if (!formIsMusyarokah && !formProgramId) {
      toast.error("Pilih program atau centang Musyarokah");
      return;
    }

    const payload = {
      ...(editingRecord ? { id: editingRecord.id } : {}),
      nama: formNama,
      programOnlineId: formIsMusyarokah ? null : formProgramId,
      isMusyarokah: formIsMusyarokah,
      nilai: formIsMusyarokah ? null : formNilai,
    };

    const res = await fetch("/api/admin/syahadah-online", {
      method: editingRecord ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      toast.success(editingRecord ? "Data diperbarui" : "Data ditambahkan");
      resetRecordForm();
      fetchRecords();
    } else {
      const err = await res.json();
      toast.error(err.error || "Gagal menyimpan");
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm("Hapus data ini?")) return;
    const res = await fetch(`/api/admin/syahadah-online?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Data dihapus");
      fetchRecords();
    } else {
      toast.error("Gagal menghapus data");
    }
  };

  const filteredRecords = records.filter((r) =>
    r.nama.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("data")}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === "data"
              ? "text-white shadow-lg"
              : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]"
          }`}
          style={activeTab === "data" ? { background: "var(--color-primary)" } : {}}
        >
          📋 Data Syahadah
        </button>
        <button
          onClick={() => setActiveTab("program")}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === "program"
              ? "text-white shadow-lg"
              : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]"
          }`}
          style={activeTab === "program" ? { background: "var(--color-primary)" } : {}}
        >
          <Settings className="inline h-4 w-4 mr-1" />
          Pengaturan Program
        </button>
      </div>

      {/* ═══════════════════ TAB: DATA SYAHADAH ═══════════════════ */}
      {activeTab === "data" && (
        <section className="space-y-4">
          {/* Actions bar */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-subtle)]" />
              <input
                type="text"
                placeholder="Cari nama..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="neu-input w-full pl-10 pr-4 py-2.5 text-sm rounded-xl"
              />
            </div>
            <button
              onClick={() => { resetRecordForm(); setShowRecordForm(true); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 shadow-lg"
              style={{ background: "var(--color-primary)" }}
            >
              <Plus className="h-4 w-4" /> Tambah Data
            </button>
          </div>

          {/* Record Form Modal */}
          {showRecordForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
                    {editingRecord ? "Edit Data" : "Tambah Data Baru"}
                  </h3>
                  <button onClick={resetRecordForm} className="p-1 rounded-lg hover:bg-slate-100">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-subtle)]">Nama Peserta</label>
                    <input
                      type="text"
                      value={formNama}
                      onChange={(e) => setFormNama(e.target.value)}
                      className="neu-input w-full mt-1 px-4 py-2.5 text-sm rounded-xl"
                      placeholder="Masukkan nama peserta"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="isMusyarokah"
                      checked={formIsMusyarokah}
                      onChange={(e) => setFormIsMusyarokah(e.target.checked)}
                      className="h-4 w-4 rounded accent-[var(--color-primary)]"
                    />
                    <label htmlFor="isMusyarokah" className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                      Musyarokah (المشاركة)
                    </label>
                  </div>

                  {!formIsMusyarokah && (
                    <>
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-subtle)]">Program</label>
                        <select
                          value={formProgramId}
                          onChange={(e) => setFormProgramId(e.target.value)}
                          className="neu-input w-full mt-1 px-4 py-2.5 text-sm rounded-xl"
                        >
                          <option value="">-- Pilih Program --</option>
                          {programs.map((p) => (
                            <option key={p.id} value={p.id}>{p.namaIndo} ({p.namaArab})</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-subtle)]">Nilai Rata-rata</label>
                        <input
                          type="number"
                          value={formNilai}
                          onChange={(e) => setFormNilai(e.target.value)}
                          className="neu-input w-full mt-1 px-4 py-2.5 text-sm rounded-xl"
                          placeholder="Contoh: 86"
                          min={0}
                          max={100}
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button onClick={resetRecordForm} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold border hover:bg-slate-50 transition">
                    Batal
                  </button>
                  <button
                    onClick={handleSaveRecord}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition hover:opacity-90"
                    style={{ background: "var(--color-primary)" }}
                  >
                    {editingRecord ? "Simpan Perubahan" : "Simpan"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Data Table */}
          <div className="neu-card overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ background: "var(--color-surface)", borderColor: "var(--color-surface-dark)" }}>
                    <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider" style={{ color: "var(--color-text-subtle)" }}>No</th>
                    <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider" style={{ color: "var(--color-text-subtle)" }}>Nama</th>
                    <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider" style={{ color: "var(--color-text-subtle)" }}>Program</th>
                    <th className="text-center px-4 py-3 font-bold text-xs uppercase tracking-wider" style={{ color: "var(--color-text-subtle)" }}>Nilai</th>
                    <th className="text-center px-4 py-3 font-bold text-xs uppercase tracking-wider" style={{ color: "var(--color-text-subtle)" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-sm" style={{ color: "var(--color-text-muted)" }}>
                        {search ? "Tidak ada data yang cocok" : "Belum ada data. Klik \"Tambah Data\" untuk memulai."}
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((r, i) => (
                      <tr key={r.id} className="border-b transition hover:bg-[var(--color-surface)]" style={{ borderColor: "var(--color-surface-dark)" }}>
                        <td className="px-4 py-3 font-medium" style={{ color: "var(--color-text-subtle)" }}>{i + 1}</td>
                        <td className="px-4 py-3 font-semibold" style={{ color: "var(--color-text)" }}>{r.nama}</td>
                        <td className="px-4 py-3">
                          {r.isMusyarokah ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              المشاركة Musyarokah
                            </span>
                          ) : (
                            <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                              {r.programOnline?.namaIndo || "-"}
                              <span className="text-xs ml-1" style={{ color: "var(--color-text-subtle)" }}>({r.programOnline?.namaArab})</span>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {r.isMusyarokah ? (
                            <span className="text-xs" style={{ color: "var(--color-text-subtle)" }}>—</span>
                          ) : (
                            <span className="font-bold" style={{ color: "var(--color-primary)" }}>{r.nilai ?? "-"}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <a
                              href={`/cetak-online/${r.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-lg hover:bg-blue-50 transition text-blue-600"
                              title="Cetak"
                            >
                              <Printer className="h-4 w-4" />
                            </a>
                            <button
                              onClick={() => openEditRecord(r)}
                              className="p-2 rounded-lg hover:bg-amber-50 transition text-amber-600"
                              title="Edit"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteRecord(r.id)}
                              className="p-2 rounded-lg hover:bg-red-50 transition text-red-500"
                              title="Hapus"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {records.length > 0 && (
            <p className="text-xs text-center" style={{ color: "var(--color-text-subtle)" }}>
              Total: {records.length} data • Ditampilkan: {filteredRecords.length}
            </p>
          )}
        </section>
      )}

      {/* ═══════════════════ TAB: PENGATURAN PROGRAM ═══════════════════ */}
      {activeTab === "program" && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              Kelola program online dan pengaturan tanggal/periode global.
            </p>
            <button
              onClick={() => { resetProgramForm(); setShowProgramForm(true); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 shadow-lg"
              style={{ background: "var(--color-primary)" }}
            >
              <Plus className="h-4 w-4" /> Tambah Program
            </button>
          </div>

          {/* Program Form Modal */}
          {showProgramForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
                    {editingProgram ? "Edit Program" : "Tambah Program Baru"}
                  </h3>
                  <button onClick={resetProgramForm} className="p-1 rounded-lg hover:bg-slate-100">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-subtle)]">Nama Program (Indo)</label>
                    <input
                      type="text"
                      value={progNamaIndo}
                      onChange={(e) => setProgNamaIndo(e.target.value)}
                      className="neu-input w-full mt-1 px-4 py-2.5 text-sm rounded-xl"
                      placeholder="Contoh: Kalam"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-subtle)]">Nama Program (Arab)</label>
                    <input
                      type="text"
                      value={progNamaArab}
                      onChange={(e) => setProgNamaArab(e.target.value)}
                      className="neu-input w-full mt-1 px-4 py-2.5 text-sm rounded-xl"
                      placeholder="Contoh: الكلام"
                      dir="rtl"
                    />
                  </div>

                  <hr className="border-[var(--color-surface-dark)]" />
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-primary)" }}>
                    Pengaturan Global Tanggal
                  </p>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-subtle)]">Tanggal Cetak (Arab)</label>
                    <input
                      type="text"
                      value={progTglCetak}
                      onChange={(e) => setProgTglCetak(e.target.value)}
                      className="neu-input w-full mt-1 px-4 py-2.5 text-sm rounded-xl"
                      placeholder="Contoh: ١٧ مايو ٢٠٢٦"
                      dir="rtl"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-subtle)]">Periode Awal (Arab)</label>
                      <input
                        type="text"
                        value={progPeriodeAwal}
                        onChange={(e) => setProgPeriodeAwal(e.target.value)}
                        className="neu-input w-full mt-1 px-4 py-2.5 text-sm rounded-xl"
                        placeholder="١٦ أبريل"
                        dir="rtl"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-subtle)]">Periode Akhir (Arab)</label>
                      <input
                        type="text"
                        value={progPeriodeAkhir}
                        onChange={(e) => setProgPeriodeAkhir(e.target.value)}
                        className="neu-input w-full mt-1 px-4 py-2.5 text-sm rounded-xl"
                        placeholder="١٠ مايو ٢٠٢٦"
                        dir="rtl"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button onClick={resetProgramForm} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold border hover:bg-slate-50 transition">
                    Batal
                  </button>
                  <button
                    onClick={handleSaveProgram}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition hover:opacity-90"
                    style={{ background: "var(--color-primary)" }}
                  >
                    {editingProgram ? "Simpan Perubahan" : "Simpan"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Program Cards */}
          {programs.length === 0 ? (
            <div className="neu-card rounded-2xl p-10 text-center">
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                Belum ada program. Klik &quot;Tambah Program&quot; untuk memulai.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {programs.map((p) => (
                <div key={p.id} className="neu-card rounded-2xl p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>{p.namaIndo}</h3>
                      <p className="text-base font-semibold mt-0.5" style={{ color: "var(--color-primary)", direction: "rtl" }}>{p.namaArab}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEditProgram(p)} className="p-2 rounded-lg hover:bg-amber-50 transition text-amber-600" title="Edit">
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDeleteProgram(p.id)} className="p-2 rounded-lg hover:bg-red-50 transition text-red-500" title="Hapus">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
                    <p>📅 Cetak: <strong>{p.tglCetakArab || "Belum diatur"}</strong></p>
                    <p>📆 Periode: <strong>{p.periodeAwal || "..."}</strong> – <strong>{p.periodeAkhir || "..."}</strong></p>
                    <p>📊 Jumlah data: <strong>{p._count?.syahadahList || 0}</strong></p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
