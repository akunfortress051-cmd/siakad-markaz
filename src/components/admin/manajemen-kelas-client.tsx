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

  // Build flat kelas list
  const allKelas = useMemo(() => {
    const list: Array<{ id: string; nama: string; programNama: string }> = [];
    programList.forEach((p) => {
      p.kelasList.forEach((k) => {
        list.push({ id: k.id, nama: k.nama, programNama: p.nama_indo });
      });
    });
    return list.sort((a, b) => a.nama.localeCompare(b.nama));
  }, [programList]);

  // Group santri
  const { grouped, unassignedByProgram } = useMemo(() => {
    const groups: Record<string, { kelasNama: string; programNama: string; santriList: DashboardSantri[] }> = {};
    const unassigned: Record<string, DashboardSantri[]> = {};

    allKelas.forEach((k) => {
      groups[k.id] = { kelasNama: k.nama, programNama: k.programNama, santriList: [] };
    });

    santriRows.forEach((s) => {
      const matchesSearch = !search || s.nama.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return;

      if (s.kelasId && groups[s.kelasId]) {
        groups[s.kelasId].santriList.push(s);
      } else {
        const progRaw = s.programNama || "";
        const isBelumDiatur = !progRaw || progRaw === "-" || progRaw.toLowerCase() === "belum diatur";
        const prog = isBelumDiatur ? "Belum Diatur" : progRaw;
        
        if (!unassigned[prog]) unassigned[prog] = [];
        unassigned[prog].push(s);
      }
    });

    return { grouped: groups, unassignedByProgram: unassigned };
  }, [santriRows, allKelas, search]);

  // Collapsed state logic: initialize ALL program-groups and kelas-groups as collapsed
  const defaultCollapsed = useMemo(() => {
    const set = new Set<string>();
    allKelas.forEach(k => set.add(k.id));
    Object.keys(unassignedByProgram).forEach(prog => set.add(`unassigned_${prog}`));
    return set;
  }, [allKelas, unassignedByProgram]); // Dependency re-evaluates properly
  
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  
  // To avoid hydrating massive lists initially if not needed
  const [isInitialized, setIsInitialized] = useState(false);
  if (!isInitialized && allKelas.length > 0) {
    setCollapsedGroups(defaultCollapsed);
    setIsInitialized(true);
  }

  // Available for add modal
  const availableForAdd = useMemo(() => {
    if (modal?.type !== "add") return [];
    const targetProgramName = allKelas.find(k => k.id === modal.targetKelasId)?.programNama || "";
    
    return santriRows
      .filter((s) => !s.kelasId || s.kelasNama === "-")
      .filter((s) => {
        // Hanya munculkan santri yang programnya SAMA dengan target kelas, atau programnya belum diatur.
        const progRaw = s.programNama || "";
        const isBelumDiatur = !progRaw || progRaw === "-" || progRaw.toLowerCase() === "belum diatur";
        const prog = isBelumDiatur ? "Belum Diatur" : progRaw;
        
        return prog === "Belum Diatur" || prog.toLowerCase() === targetProgramName.toLowerCase();
      })
      .filter((s) => !modalSearch || s.nama.toLowerCase().includes(modalSearch.toLowerCase()))
      .sort((a, b) => a.nama.localeCompare(b.nama));
  }, [santriRows, modalSearch, modal, allKelas]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleCollapse = (id: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
      <div className="neu-card-white p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-subtle)]" />
          <input
            type="text"
            placeholder="Cari santri di semua kelas & program..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-[var(--color-surface-dark)] bg-[var(--color-secondary)] pl-10 pr-4 py-2.5 text-sm font-semibold text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:bg-white"
          />
        </div>
      </div>

      {/* Section: Belum Dialokasi (By Program) */}
      <div className="space-y-4">
        {Object.entries(unassignedByProgram).map(([progName, santriList]) => {
          const groupId = `unassigned_${progName}`;
          const isCollapsed = collapsedGroups.has(groupId);
          const isBelumDiatur = progName === "Belum Diatur";
          
          return (
            <div key={groupId} className={`rounded-[var(--radius-2xl)] border-2 border-dashed ${isBelumDiatur ? 'border-red-300 bg-red-50/50' : 'border-[var(--color-warning)] bg-[var(--color-warning-light)]/50'} overflow-hidden shadow-sm transition-all`}>
              <button
                onClick={() => toggleCollapse(groupId)}
                className={`w-full flex items-center justify-between p-4 sm:p-5 text-left border-b ${isBelumDiatur ? 'border-red-200' : 'border-[var(--color-warning-light)]'}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl transition-transform ${isBelumDiatur ? 'bg-red-100 text-red-500' : 'bg-[var(--color-warning-light)] text-[var(--color-warning)]'} ${isCollapsed ? "" : "rotate-90"}`}>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className={`font-bold text-base ${isBelumDiatur ? 'text-red-700' : 'text-[var(--color-warning)]'}`}>
                      {progName} (Belum Dialokasi Kelas)
                    </h3>
                    <p className={`text-[11px] font-semibold mt-0.5 ${isBelumDiatur ? 'text-red-500' : 'text-[var(--color-warning)]'}`}>
                      {santriList.length} santri menunggu alokasi
                    </p>
                  </div>
                </div>
              </button>

              {!isCollapsed && (
                <div className="p-4 sm:p-5">
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {santriList.map((s) => (
                      <div key={s.id} className={`flex items-center justify-between bg-white rounded-xl border ${isBelumDiatur ? 'border-red-200' : 'border-[var(--color-warning-light)]'} px-3 py-2.5`}>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[var(--color-text)] truncate">{s.nama}</p>
                          <p className="text-[11px] font-medium text-[var(--color-text-muted)] truncate">{s.lokasi}</p>
                        </div>
                        <span className={`shrink-0 ml-2 text-[10px] font-bold px-2 py-0.5 rounded-md ${s.gender === "BANIN" ? "bg-[var(--color-primary-50)] text-[var(--color-primary)]" : "bg-[var(--color-danger-light)] text-[var(--color-danger)]"}`}>
                          {s.gender}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Grid: Per Kelas */}
      <div className="space-y-4">
        {allKelas.map((kelas) => {
          const group = grouped[kelas.id];
          if (!group) return null;
          const isCollapsed = collapsedGroups.has(kelas.id);

          return (
            <div key={kelas.id} className="neu-card-white overflow-hidden transition-all">
              {/* Kelas Header */}
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[var(--color-surface)] bg-[var(--color-surface-light)]">
                <button
                  onClick={() => toggleCollapse(kelas.id)}
                  className="flex items-center gap-3 text-left flex-1 min-w-0"
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary-100)] text-[var(--color-primary)] transition-transform ${isCollapsed ? "" : "rotate-90"}`}>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-[var(--color-text)] text-base truncate">{kelas.nama}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">{kelas.programNama}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300" />
                      <span className="text-[11px] font-bold text-[var(--color-primary)]">{group.santriList.length} santri</span>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => openAddModal(kelas.id, kelas.nama)}
                  className="flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-3.5 py-2 text-xs font-bold text-white transition hover:bg-[var(--color-primary-dark)] shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Tambah
                </button>
              </div>

              {/* Kelas Body */}
              {!isCollapsed && (
                <div className="p-4 sm:p-5">
                  {group.santriList.length === 0 ? (
                    <p className="text-center text-sm text-[var(--color-text-subtle)] font-medium py-6">
                      Belum ada santri di kelas ini.
                    </p>
                  ) : (
                    <div className="divide-y divide-[var(--color-surface)]">
                      {group.santriList.sort((a, b) => a.nama.localeCompare(b.nama)).map((santri, idx) => (
                        <div key={santri.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-xs font-bold text-[var(--color-text-subtle)] w-5 shrink-0 text-right">{idx + 1}</span>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-[var(--color-text)] truncate">{santri.nama}</p>
                              <p className="text-[11px] font-medium text-[var(--color-text-muted)] truncate">{santri.lokasi}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${santri.gender === "BANIN" ? "bg-[var(--color-primary-50)] text-[var(--color-primary)]" : "bg-[var(--color-danger-light)] text-[var(--color-danger)]"}`}>
                              {santri.gender}
                            </span>
                            <button
                              onClick={() => openMoveModal(santri.id, santri.nama, kelas.nama)}
                              disabled={isSaving}
                              className="flex items-center gap-1 rounded-lg border border-[var(--color-surface-dark)] bg-white px-2.5 py-1.5 text-[11px] font-bold text-[var(--color-text-muted)] transition hover:border-violet-400 hover:text-violet-700 disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-text)]/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl neu-card flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="border-b border-[var(--color-surface-dark)] px-6 py-4 flex justify-between items-center bg-[var(--color-surface-light)] shrink-0">
              <div>
                <h3 className="text-lg font-bold text-[var(--color-text)]">Tambah Santri</h3>
                <p className="text-xs font-semibold text-[var(--color-primary)] mt-0.5">
                  ke kelas: {modal.targetKelasNama}
                </p>
              </div>
              <button onClick={closeModal} disabled={isSaving} className="text-[var(--color-text-subtle)] hover:text-[var(--color-text-muted)] transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search in Modal */}
            <div className="px-5 pt-4 pb-2 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-subtle)]" />
                <input
                  type="text"
                  placeholder="Cari nama santri..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-surface-dark)] bg-[var(--color-secondary)] pl-9 pr-4 py-2 text-sm font-semibold outline-none transition focus:border-[var(--color-primary)]"
                />
              </div>
              {availableForAdd.length > 0 && (
                <div className="flex items-center justify-between mt-3">
                  <button
                    onClick={toggleSelectAll}
                    className="text-xs font-bold text-[var(--color-primary)] hover:text-[var(--color-primary)] transition"
                  >
                    {selectedIds.size === availableForAdd.length ? "Batal Semua" : "Pilih Semua"}
                  </button>
                  <span className="text-xs font-semibold text-[var(--color-text-subtle)]">
                    {selectedIds.size} dipilih dari {availableForAdd.length}
                  </span>
                </div>
              )}
            </div>

            {/* Santri List */}
            <div className="flex-1 overflow-y-auto px-5 pb-3">
              {availableForAdd.length === 0 ? (
                <div className="text-center py-10 text-sm text-[var(--color-text-subtle)] font-medium">
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
                        className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${isChecked ? "bg-[var(--color-primary-50)] border border-[var(--color-primary-100)]" : "bg-white border border-[var(--color-surface)] hover:bg-[var(--color-secondary)]"}`}
                      >
                        <div className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition shrink-0 ${isChecked ? "bg-[var(--color-primary)] border-[var(--color-primary)]" : "border-[var(--color-surface-dark)]"}`}>
                          {isChecked && (
                            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-[var(--color-text)] truncate">{s.nama}</p>
                          <p className="text-[11px] text-[var(--color-text-muted)] truncate">{s.lokasi}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${s.gender === "BANIN" ? "bg-[var(--color-primary-50)] text-[var(--color-primary)]" : "bg-[var(--color-danger-light)] text-[var(--color-danger)]"}`}>
                          {s.gender}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-[var(--color-surface-dark)] px-6 py-4 bg-[var(--color-secondary)] flex items-center justify-between shrink-0">
              <button
                onClick={closeModal}
                className="px-5 py-2 rounded-full text-sm font-bold text-[var(--color-text-muted)] hover:bg-[var(--color-surface-dark)] transition"
                disabled={isSaving}
              >
                Batal
              </button>
              <button
                onClick={handleAddSubmit}
                disabled={isSaving || selectedIds.size === 0}
                className="rounded-full bg-[var(--color-primary)] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
              >
                {isSaving ? "Menyimpan..." : `Tambahkan ${selectedIds.size} Santri`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: PINDAH KELAS ===== */}
      {modal?.type === "move" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-text)]/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl neu-card flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="border-b border-[var(--color-surface-dark)] px-6 py-4 flex justify-between items-center bg-[var(--color-surface-light)] shrink-0">
              <div>
                <h3 className="text-lg font-bold text-[var(--color-text)]">Pindah Kelas</h3>
                <p className="text-xs font-medium text-[var(--color-text-muted)] mt-0.5">
                  <span className="font-bold text-[var(--color-text)]">{modal.santriNama}</span>
                  <span className="mx-1.5">→</span>
                  <span className="text-violet-600 font-bold">dari {modal.fromKelasNama}</span>
                </p>
              </div>
              <button onClick={closeModal} disabled={isSaving} className="text-[var(--color-text-subtle)] hover:text-[var(--color-text-muted)] transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Kelas List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {programList.map((program) =>
                program.kelasList.length > 0 ? (
                  <div key={program.id} className="border border-[var(--color-surface)] rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-[var(--color-secondary)] px-4 py-2.5 text-xs font-black tracking-widest uppercase text-[var(--color-text-muted)] border-b border-[var(--color-surface)] flex items-center gap-2">
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
                                ? "border-[var(--color-primary-100)] bg-[var(--color-primary-50)] text-[var(--color-primary)] cursor-not-allowed"
                                : "border-[var(--color-surface-dark)] text-[var(--color-text)] hover:border-violet-500 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-50"
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
            <div className="border-t border-[var(--color-surface-dark)] px-6 py-4 bg-[var(--color-secondary)] flex justify-end shrink-0">
              <button
                onClick={closeModal}
                className="px-5 py-2 rounded-full text-sm font-bold text-[var(--color-text-muted)] hover:bg-[var(--color-surface-dark)] transition"
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
