"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, ArrowRightLeft, Search, Users, X, BookOpen, ChevronDown, ChevronRight } from "lucide-react";

type DashboardSantri = {
  id: string;
  nama: string;
  gender: string;
  lokasi: string;
  programNama: string;
  kelasNama: string;
  kelasId: string | null;
  isAktif: boolean;
  dufahNama: string;
};

type ProgramItem = {
  id: string;
  nama_indo: string;
  nama_arab: string;
  kelasList: Array<{
    id: string;
    nama: string;
  }>;
};

type ModalMode =
  | { type: "add"; targetKelasId: string; targetKelasNama: string }
  | { type: "move"; santriId: string; santriNama: string; fromKelasNama: string };

export function ManajemenKelasClient({
  santriRows,
  programList,
}: {
  santriRows: DashboardSantri[];
  programList: ProgramItem[];
}) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalMode | null>(null);
  const [modalSearch, setModalSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Build flat kelas list from programList
  const allKelas = useMemo(() => {
    const list: Array<{ id: string; nama: string; programNama: string }> = [];
    programList.forEach((p) => {
      p.kelasList.forEach((k) => {
        list.push({ id: k.id, nama: k.nama, programNama: p.nama_indo });
      });
    });
    return list.sort((a, b) => a.nama.localeCompare(b.nama));
  }, [programList]);

  // Group santri by kelasId
  const { grouped, unassigned } = useMemo(() => {
    const groups: Record<string, { kelasNama: string; santriList: DashboardSantri[] }> = {};
    const noKelas: DashboardSantri[] = [];

    // Initialize all kelas groups (even empty)
    allKelas.forEach((k) => {
      groups[k.id] = { kelasNama: k.nama, santriList: [] };
    });

    santriRows.forEach((s) => {
      const matchesSearch = !search || s.nama.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return;

      if (s.kelasId && groups[s.kelasId]) {
        groups[s.kelasId].santriList.push(s);
      } else {
        noKelas.push(s);
      }
    });

    return { grouped: groups, unassigned: noKelas };
  }, [santriRows, allKelas, search]);

  // Santri available for "Add" modal = those without a kelas
  const availableForAdd = useMemo(() => {
    return santriRows
      .filter((s) => !s.kelasId || s.kelasNama === "-")
      .filter((s) =>
        !modalSearch || s.nama.toLowerCase().includes(modalSearch.toLowerCase())
      )
      .sort((a, b) => a.nama.localeCompare(b.nama));
  }, [santriRows, modalSearch]);

  const toggleCollapse = (kelasId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(kelasId)) next.delete(kelasId);
      else next.add(kelasId);
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === availableForAdd.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(availableForAdd.map((s) => s.id)));
    }
  };

  const openAddModal = (kelasId: string, kelasNama: string) => {
    setModal({ type: "add", targetKelasId: kelasId, targetKelasNama: kelasNama });
    setModalSearch("");
    setSelectedIds(new Set());
  };

  const openMoveModal = (santriId: string, santriNama: string, fromKelasNama: string) => {
    setModal({ type: "move", santriId, santriNama, fromKelasNama });
  };

  const closeModal = () => {
    setModal(null);
    setModalSearch("");
    setSelectedIds(new Set());
  };

  const handleAssign = async (santriIds: string[], kelasId: string) => {
    if (santriIds.length === 0) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/manajemen-kelas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ santriIds, kelasId }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Gagal menyimpan kelas");
      } else {
        closeModal();
        router.refresh();
      }
    } catch {
      alert("Terjadi kesalahan sistem.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSubmit = () => {
    if (modal?.type !== "add") return;
    handleAssign(Array.from(selectedIds), modal.targetKelasId);
  };

  const handleMoveSubmit = (kelasId: string) => {
    if (modal?.type !== "move") return;
    handleAssign([modal.santriId], kelasId);
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari santri di semua kelas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Section: Belum Dialokasi */}
      {unassigned.length > 0 && (
        <div className="rounded-[2rem] border-2 border-dashed border-amber-300 bg-amber-50/50 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-amber-800">Belum Dialokasi</h3>
                <p className="text-xs font-semibold text-amber-600">{unassigned.length} santri belum memiliki kelas</p>
              </div>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {unassigned.map((s) => (
              <div key={s.id} className="flex items-center justify-between bg-white rounded-xl border border-amber-200 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{s.nama}</p>
                  <p className="text-[11px] font-medium text-slate-500 truncate">{s.lokasi}</p>
                </div>
                <span className={`shrink-0 ml-2 text-[10px] font-bold px-2 py-0.5 rounded-md ${s.gender === "BANIN" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                  {s.gender}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid: Per Kelas */}
      <div className="space-y-4">
        {allKelas.map((kelas) => {
          const group = grouped[kelas.id];
          if (!group) return null;
          const isCollapsed = collapsedGroups.has(kelas.id);

          return (
            <div key={kelas.id} className="rounded-[2rem] border border-slate-200 bg-white shadow-sm overflow-hidden transition-all">
              {/* Kelas Header */}
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
                <button
                  onClick={() => toggleCollapse(kelas.id)}
                  className="flex items-center gap-3 text-left flex-1 min-w-0"
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 transition-transform ${isCollapsed ? "" : "rotate-90"}`}>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-800 text-base truncate">{kelas.nama}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] font-semibold text-slate-500">{kelas.programNama}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300" />
                      <span className="text-[11px] font-bold text-emerald-600">{group.santriList.length} santri</span>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => openAddModal(kelas.id, kelas.nama)}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Tambah
                </button>
              </div>

              {/* Kelas Body */}
              {!isCollapsed && (
                <div className="p-4 sm:p-5">
                  {group.santriList.length === 0 ? (
                    <p className="text-center text-sm text-slate-400 font-medium py-6">
                      Belum ada santri di kelas ini.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {group.santriList.sort((a, b) => a.nama.localeCompare(b.nama)).map((santri, idx) => (
                        <div key={santri.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-xs font-bold text-slate-400 w-5 shrink-0 text-right">{idx + 1}</span>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-800 truncate">{santri.nama}</p>
                              <p className="text-[11px] font-medium text-slate-500 truncate">{santri.lokasi}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${santri.gender === "BANIN" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                              {santri.gender}
                            </span>
                            <button
                              onClick={() => openMoveModal(santri.id, santri.nama, kelas.nama)}
                              disabled={isSaving}
                              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 transition hover:border-violet-400 hover:text-violet-700 disabled:opacity-50"
                            >
                              <ArrowRightLeft className="h-3 w-3" />
                              Pindah
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ===== MODAL: TAMBAH SANTRI ===== */}
      {modal?.type === "add" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="border-b border-slate-200 px-6 py-4 flex justify-between items-center bg-slate-50/50 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Tambah Santri</h3>
                <p className="text-xs font-semibold text-emerald-600 mt-0.5">
                  ke kelas: {modal.targetKelasNama}
                </p>
              </div>
              <button onClick={closeModal} disabled={isSaving} className="text-slate-400 hover:text-slate-600 transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search in Modal */}
            <div className="px-5 pt-4 pb-2 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama santri..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-sm font-semibold outline-none transition focus:border-emerald-500"
                />
              </div>
              {availableForAdd.length > 0 && (
                <div className="flex items-center justify-between mt-3">
                  <button
                    onClick={toggleSelectAll}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition"
                  >
                    {selectedIds.size === availableForAdd.length ? "Batal Semua" : "Pilih Semua"}
                  </button>
                  <span className="text-xs font-semibold text-slate-400">
                    {selectedIds.size} dipilih dari {availableForAdd.length}
                  </span>
                </div>
              )}
            </div>

            {/* Santri List */}
            <div className="flex-1 overflow-y-auto px-5 pb-3">
              {availableForAdd.length === 0 ? (
                <div className="text-center py-10 text-sm text-slate-400 font-medium">
                  Semua santri sudah memiliki kelas.
                </div>
              ) : (
                <div className="space-y-1">
                  {availableForAdd.map((s) => {
                    const isChecked = selectedIds.has(s.id);
                    return (
                      <button
                        key={s.id}
                        onClick={() => toggleSelect(s.id)}
                        className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${isChecked ? "bg-emerald-50 border border-emerald-200" : "bg-white border border-slate-100 hover:bg-slate-50"}`}
                      >
                        <div className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition shrink-0 ${isChecked ? "bg-emerald-600 border-emerald-600" : "border-slate-300"}`}>
                          {isChecked && (
                            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-800 truncate">{s.nama}</p>
                          <p className="text-[11px] text-slate-500 truncate">{s.lokasi}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${s.gender === "BANIN" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                          {s.gender}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 flex items-center justify-between shrink-0">
              <button
                onClick={closeModal}
                className="px-5 py-2 rounded-full text-sm font-bold text-slate-600 hover:bg-slate-200 transition"
                disabled={isSaving}
              >
                Batal
              </button>
              <button
                onClick={handleAddSubmit}
                disabled={isSaving || selectedIds.size === 0}
                className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {isSaving ? "Menyimpan..." : `Tambahkan ${selectedIds.size} Santri`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: PINDAH KELAS ===== */}
      {modal?.type === "move" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="border-b border-slate-200 px-6 py-4 flex justify-between items-center bg-slate-50/50 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Pindah Kelas</h3>
                <p className="text-xs font-medium text-slate-500 mt-0.5">
                  <span className="font-bold text-slate-700">{modal.santriNama}</span>
                  <span className="mx-1.5">→</span>
                  <span className="text-violet-600 font-bold">dari {modal.fromKelasNama}</span>
                </p>
              </div>
              <button onClick={closeModal} disabled={isSaving} className="text-slate-400 hover:text-slate-600 transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Kelas List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {programList.map((program) =>
                program.kelasList.length > 0 ? (
                  <div key={program.id} className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-slate-50 px-4 py-2.5 text-xs font-black tracking-widest uppercase text-slate-600 border-b border-slate-100 flex items-center gap-2">
                      <BookOpen className="h-3.5 w-3.5" />
                      {program.nama_indo}
                    </div>
                    <div className="p-3 grid grid-cols-2 gap-2 bg-white">
                      {program.kelasList.map((nk) => {
                        const isCurrentKelas = grouped[nk.id]?.santriList.some((s) => s.id === modal.santriId);
                        return (
                          <button
                            key={nk.id}
                            onClick={() => handleMoveSubmit(nk.id)}
                            disabled={isSaving || isCurrentKelas}
                            className={`flex items-center justify-center rounded-xl border p-3 text-sm font-bold transition active:scale-95 ${
                              isCurrentKelas
                                ? "border-emerald-300 bg-emerald-50 text-emerald-600 cursor-not-allowed"
                                : "border-slate-200 text-slate-700 hover:border-violet-500 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-50"
                            }`}
                          >
                            {nk.nama}
                            {isCurrentKelas && <span className="ml-1.5 text-[10px]">(saat ini)</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 flex justify-end shrink-0">
              <button
                onClick={closeModal}
                className="px-5 py-2 rounded-full text-sm font-bold text-slate-600 hover:bg-slate-200 transition"
                disabled={isSaving}
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
