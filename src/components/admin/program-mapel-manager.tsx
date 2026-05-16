"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertTriangle,
  BookOpen,
  XCircle,
  Pencil,
  Check,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type MapelItem = {
  mapelId: string;
  urutan: number;
  mapel: { 
    id: string; 
    nama_indo: string; 
    nama_arab: string;
    jumlah_tes: number;
    tampil_di_syahadah: boolean;
    masuk_akumulasi: boolean;
    bobot: number;
    bobot_usbu: number;
  };
};

type ProgramItem = {
  id: string;
  nama_indo: string;
  nama_arab: string;
  kkm: number;
  programMapels: MapelItem[];
  _count: { riwayatRecords: number };
};

// ─── Sortable Mapel Row ────────────────────────────────────────────────────────

function SortableMapelRow({
  item,
  programId,
  onDelete,
  onUpdated,
}: {
  item: MapelItem;
  programId: string;
  onDelete: (mapelId: string) => void;
  onUpdated: (mapelId: string, namaIndo: string, namaArab: string, jumlahTes: number, tampilSyahadah: boolean, masukAkumulasi: boolean, bobot: number, bobotUsbu: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.mapelId,
  });

  const [editing, setEditing] = useState(false);
  const [editIndo, setEditIndo] = useState(item.mapel.nama_indo);
  const [editArab, setEditArab] = useState(item.mapel.nama_arab);
  const [editJumlahTes, setEditJumlahTes] = useState(item.mapel.jumlah_tes ?? 3);
  const [editTampilSyahadah, setEditTampilSyahadah] = useState(item.mapel.tampil_di_syahadah ?? true);
  const [editMasukAkumulasi, setEditMasukAkumulasi] = useState(item.mapel.masuk_akumulasi ?? true);
  const [editBobot, setEditBobot] = useState(item.mapel.bobot ?? 1);
  const [editBobotUsbu, setEditBobotUsbu] = useState(item.mapel.bobot_usbu ?? 1);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!editIndo.trim() || !editArab.trim()) {
      toast.error("Nama mapel Indo & Arab wajib diisi.");
      return;
    }
    setSaving(true);
    const toastId = toast.loading("Menyimpan...");
    try {
      const res = await fetch(`/api/admin/program/${programId}/mapel/${item.mapelId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          nama_indo: editIndo.trim(), 
          nama_arab: editArab.trim(),
          jumlah_tes: editJumlahTes,
          tampil_di_syahadah: editTampilSyahadah,
          masuk_akumulasi: editMasukAkumulasi,
          bobot: editBobot,
          bobot_usbu: editBobotUsbu
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Gagal menyimpan.", { id: toastId });
        return;
      }
      toast.success("Mapel diperbarui!", { id: toastId });
      onUpdated(item.mapelId, editIndo.trim(), editArab.trim(), editJumlahTes, editTampilSyahadah, editMasukAkumulasi, editBobot, editBobotUsbu);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 99 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
    >
      {/* Row utama */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        {/* Drag handle — sembunyikan saat editing */}
        {!editing && (
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab touch-none text-slate-300 hover:text-slate-500 active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{editIndo}</p>
          <p className="text-xs text-slate-400 truncate" dir="rtl">{editArab}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {editJumlahTes === 1 && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">1x Tes</span>}
            {!editMasukAkumulasi && <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded font-medium">Non-Akumulasi</span>}
            {!editTampilSyahadah && <span className="text-[10px] bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded font-medium">Non-Syahadah</span>}
            <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-medium">Bobot Usbu' {editBobotUsbu}%</span>
            <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-medium">Bobot Syahadah {editBobot}%</span>
          </div>
        </div>

        {/* Tombol edit */}
        <button
          onClick={() => setEditing((v) => !v)}
          className={`shrink-0 rounded-lg p-1.5 transition ${editing ? "bg-amber-100 text-amber-600" : "text-slate-400 hover:bg-amber-50 hover:text-amber-500"}`}
          title="Edit mapel"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onDelete(item.mapelId)}
          className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition"
          title="Hapus mapel"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Form edit inline */}
      {editing && (
        <div className="border-t border-amber-100 bg-amber-50 px-3 py-3 space-y-2">
          <input
            type="text"
            value={editIndo}
            onChange={(e) => setEditIndo(e.target.value)}
            placeholder="Nama Mapel (Indonesia)"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-amber-400"
          />
          <input
            type="text"
            dir="rtl"
            value={editArab}
            onChange={(e) => setEditArab(e.target.value)}
            placeholder="اسم المادة (عربي)"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-amber-400"
          />
          <div className="flex flex-col gap-2 rounded-xl bg-white p-2 border border-slate-200 text-xs">
            <label className="flex items-center gap-2">
              <span className="w-32 font-semibold text-slate-600">Jml. Tes</span>
              <select 
                value={editJumlahTes} 
                onChange={(e) => setEditJumlahTes(Number(e.target.value))}
                className="rounded border-slate-200 p-1 flex-1 outline-none"
              >
                <option value={3}>3x Tes (Usbu 1, Usbu 2, Nihai)</option>
                <option value={1}>1x Tes (Langsung Nilai Akhir)</option>
              </select>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={editMasukAkumulasi} onChange={(e) => setEditMasukAkumulasi(e.target.checked)} className="rounded text-amber-500 w-3.5 h-3.5" />
              <span className="text-slate-600">Masuk Akumulasi Rata-rata</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={editTampilSyahadah} onChange={(e) => setEditTampilSyahadah(e.target.checked)} className="rounded text-amber-500 w-3.5 h-3.5" />
              <span className="text-slate-600">Tampil di Syahadah</span>
            </label>
            <label className="flex items-center gap-2">
              <span className="w-32 font-semibold text-slate-600">Bobot Rapor Usbu' (%)</span>
              <input type="number" min={0} max={100} value={editBobotUsbu} onChange={(e) => setEditBobotUsbu(Number(e.target.value))} className="rounded border-slate-200 p-1 flex-1 outline-none" />
            </label>
            <label className="flex items-center gap-2">
              <span className="w-32 font-semibold text-slate-600">Bobot Syahadah Akhir (%)</span>
              <input type="number" min={0} max={100} value={editBobot} onChange={(e) => setEditBobot(Number(e.target.value))} className="rounded border-slate-200 p-1 flex-1 outline-none" />
            </label>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-amber-500 py-1.5 text-xs font-bold text-white hover:bg-amber-600 disabled:opacity-60 transition"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              Simpan
            </button>
            <button
              onClick={() => { 
                setEditing(false); 
                setEditIndo(item.mapel.nama_indo); 
                setEditArab(item.mapel.nama_arab); 
                setEditJumlahTes(item.mapel.jumlah_tes);
                setEditTampilSyahadah(item.mapel.tampil_di_syahadah);
                setEditMasukAkumulasi(item.mapel.masuk_akumulasi);
                setEditBobot(item.mapel.bobot);
                setEditBobotUsbu(item.mapel.bobot_usbu);
              }}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 transition"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Program Card ─────────────────────────────────────────────────────────────

function ProgramCard({
  program,
  onDeleted,
  onReload,
}: {
  program: ProgramItem;
  onDeleted: (id: string) => void;
  onReload: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [mapels, setMapels] = useState<MapelItem[]>(program.programMapels);
  const [addingMapel, setAddingMapel] = useState(false);
  const [newMapelIndo, setNewMapelIndo] = useState("");
  const [newMapelArab, setNewMapelArab] = useState("");
  const [newJumlahTes, setNewJumlahTes] = useState(3);
  const [newTampilSyahadah, setNewTampilSyahadah] = useState(true);
  const [newMasukAkumulasi, setNewMasukAkumulasi] = useState(true);
  const [newBobot, setNewBobot] = useState(1);
  const [newBobotUsbu, setNewBobotUsbu] = useState(1);
  const [savingOrder, setSavingOrder] = useState(false);

  // Edit program state
  const [editingProgram, setEditingProgram] = useState(false);
  const [editNamaIndo, setEditNamaIndo] = useState(program.nama_indo);
  const [editNamaArab, setEditNamaArab] = useState(program.nama_arab);
  const [editKkm, setEditKkm] = useState(String(program.kkm));
  const [savingProgram, setSavingProgram] = useState(false);
  const [programNama, setProgramNama] = useState(program.nama_indo);
  const [programNamaArab, setProgramNamaArab] = useState(program.nama_arab);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const canDelete = program._count.riwayatRecords === 0;

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = mapels.findIndex((m) => m.mapelId === active.id);
      const newIndex = mapels.findIndex((m) => m.mapelId === over.id);
      const reordered = arrayMove(mapels, oldIndex, newIndex).map((m, i) => ({
        ...m,
        urutan: i + 1,
      }));
      setMapels(reordered);

      setSavingOrder(true);
      try {
        const res = await fetch(`/api/admin/program/${program.id}/mapel`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: reordered.map((m) => ({ mapelId: m.mapelId, urutan: m.urutan })) }),
        });
        if (!res.ok) throw new Error();
      } catch {
        toast.error("Gagal menyimpan urutan.");
        setMapels(program.programMapels); // rollback
      } finally {
        setSavingOrder(false);
      }
    },
    [mapels, program.id, program.programMapels]
  );

  const handleDeleteMapel = async (mapelId: string) => {
    if (!confirm("Hapus mapel ini dari program? Nilai lama yang sudah tersimpan tetap aman.")) return;

    const toastId = toast.loading("Menghapus mapel...");
    const res = await fetch(`/api/admin/program/${program.id}/mapel/${mapelId}`, { method: "DELETE" });
    const data = await res.json();

    if (!res.ok) {
      toast.error(data.error || "Gagal menghapus.", { id: toastId });
      return;
    }

    toast.success(data.softDelete ? "Mapel dihapus dari program (nilai lama aman)." : "Mapel dihapus permanen.", { id: toastId });
    setMapels((prev) => prev.filter((m) => m.mapelId !== mapelId));
  };

  const handleAddMapel = async () => {
    if (!newMapelIndo.trim() || !newMapelArab.trim()) {
      toast.error("Nama mapel Indo & Arab wajib diisi.");
      return;
    }

    const toastId = toast.loading("Menambah mapel...");
    const res = await fetch(`/api/admin/program/${program.id}/mapel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        nama_indo: newMapelIndo.trim(), 
        nama_arab: newMapelArab.trim(),
        jumlah_tes: newJumlahTes,
        tampil_di_syahadah: newTampilSyahadah,
        masuk_akumulasi: newMasukAkumulasi,
        bobot: newBobot,
        bobot_usbu: newBobotUsbu
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      toast.error(data.error || "Gagal menambah.", { id: toastId });
      return;
    }

    toast.success("Mapel berhasil ditambahkan!", { id: toastId });
    setNewMapelIndo("");
    setNewMapelArab("");
    setNewJumlahTes(3);
    setNewTampilSyahadah(true);
    setNewMasukAkumulasi(true);
    setNewBobot(1);
    setNewBobotUsbu(1);
    setAddingMapel(false);
    onReload();
  };

  const handleDeleteProgram = async () => {
    if (!confirm(`Hapus program "${programNama}" secara permanen?`)) return;
    const toastId = toast.loading("Menghapus program...");
    const res = await fetch(`/api/admin/program/${program.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Gagal menghapus.", { id: toastId });
      return;
    }
    toast.success("Program berhasil dihapus.", { id: toastId });
    onDeleted(program.id);
  };

  const handleSaveProgram = async () => {
    if (!editNamaIndo.trim() || !editNamaArab.trim()) {
      toast.error("Nama program wajib diisi.");
      return;
    }
    setSavingProgram(true);
    const toastId = toast.loading("Menyimpan...");
    try {
      const res = await fetch(`/api/admin/program/${program.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama_indo: editNamaIndo.trim(),
          nama_arab: editNamaArab.trim(),
          kkm: Number(editKkm),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Gagal menyimpan.", { id: toastId });
        return;
      }
      toast.success("Program berhasil diperbarui!", { id: toastId });
      setProgramNama(editNamaIndo.trim());
      setProgramNamaArab(editNamaArab.trim());
      setEditingProgram(false);
      onReload();
    } finally {
      setSavingProgram(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
        <BookOpen className="h-5 w-5 text-emerald-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 truncate">{programNama}</p>
          <p className="text-xs text-slate-400 truncate" dir="rtl">{programNamaArab}</p>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
          {mapels.length} mapel
        </span>
        {/* Edit nama program */}
        <button
          onClick={() => { setEditingProgram((v) => !v); setExpanded(true); }}
          className="shrink-0 rounded-xl p-2 text-slate-400 hover:bg-amber-50 hover:text-amber-500 transition"
          title="Edit program"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 rounded-xl p-2 text-slate-400 hover:bg-slate-200 transition"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {expanded && (
        <div className="px-5 py-4 space-y-4">

          {/* Inline edit program */}
          {editingProgram && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
              <p className="text-sm font-bold text-amber-700">Edit Program</p>
              <input
                type="text"
                placeholder="Nama (Indonesia)"
                value={editNamaIndo}
                onChange={(e) => setEditNamaIndo(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400"
              />
              <input
                type="text"
                dir="rtl"
                placeholder="الاسم بالعربية"
                value={editNamaArab}
                onChange={(e) => setEditNamaArab(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400"
              />
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-slate-600 whitespace-nowrap">KKM :</label>
                <input
                  type="number"
                  min={0} max={100}
                  value={editKkm}
                  onChange={(e) => setEditKkm(e.target.value)}
                  className="w-20 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-center font-bold outline-none focus:border-amber-400"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveProgram}
                  disabled={savingProgram}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-amber-500 py-2 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-60 transition"
                >
                  {savingProgram ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Simpan
                </button>
                <button
                  onClick={() => { setEditingProgram(false); setEditNamaIndo(programNama); setEditNamaArab(programNamaArab); }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
          {/* Mapel list drag-and-drop */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={mapels.map((m) => m.mapelId)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {mapels.length === 0 ? (
                  <p className="text-sm italic text-slate-400 text-center py-2">Belum ada mapel</p>
                ) : (
                  mapels.map((item) => (
                    <SortableMapelRow
                      key={item.mapelId}
                      item={item}
                      programId={program.id}
                      onDelete={handleDeleteMapel}
                      onUpdated={(mapelId, namaIndo, namaArab, jumlahTes, tampilSyahadah, masukAkumulasi, bobot, bobotUsbu) => {
                        setMapels((prev) =>
                          prev.map((m) =>
                            m.mapelId === mapelId
                              ? { ...m, mapel: { ...m.mapel, nama_indo: namaIndo, nama_arab: namaArab, jumlah_tes: jumlahTes, tampil_di_syahadah: tampilSyahadah, masuk_akumulasi: masukAkumulasi, bobot: bobot, bobot_usbu: bobotUsbu } }
                              : m
                          )
                        );
                      }}
                    />
                  ))
                )}
              </div>
            </SortableContext>
          </DndContext>

          {savingOrder && (
            <p className="flex items-center gap-2 text-xs text-slate-400">
              <Loader2 className="h-3 w-3 animate-spin" /> Menyimpan urutan...
            </p>
          )}

          {/* Form tambah mapel inline */}
          {addingMapel ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
              <p className="text-sm font-bold text-emerald-700">Tambah Mapel Baru</p>
              <input
                type="text"
                placeholder="Nama Mapel (Indonesia)"
                value={newMapelIndo}
                onChange={(e) => setNewMapelIndo(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
              <input
                type="text"
                dir="rtl"
                placeholder="اسم المادة (عربي)"
                value={newMapelArab}
                onChange={(e) => setNewMapelArab(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
              <div className="flex flex-col gap-2 rounded-xl bg-white p-2 border border-slate-200 text-xs">
                <label className="flex items-center gap-2">
                  <span className="w-32 font-semibold text-slate-600">Jml. Tes</span>
                  <select 
                    value={newJumlahTes} 
                    onChange={(e) => setNewJumlahTes(Number(e.target.value))}
                    className="rounded border-slate-200 p-1 flex-1 outline-none bg-slate-50"
                  >
                    <option value={3}>3x Tes (Usbu 1, Usbu 2, Nihai)</option>
                    <option value={1}>1x Tes (Langsung Nilai Akhir)</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={newMasukAkumulasi} onChange={(e) => setNewMasukAkumulasi(e.target.checked)} className="rounded text-emerald-500 w-3.5 h-3.5" />
                  <span className="text-slate-600">Masuk Akumulasi Rata-rata</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={newTampilSyahadah} onChange={(e) => setNewTampilSyahadah(e.target.checked)} className="rounded text-emerald-500 w-3.5 h-3.5" />
                  <span className="text-slate-600">Tampil di Syahadah</span>
                </label>
                <label className="flex items-center gap-2">
                  <span className="w-32 font-semibold text-slate-600">Bobot Rapor Usbu' (%)</span>
                  <input type="number" min={0} max={100} value={newBobotUsbu} onChange={(e) => setNewBobotUsbu(Number(e.target.value))} className="rounded border-slate-200 p-1 flex-1 outline-none bg-slate-50" />
                </label>
                <label className="flex items-center gap-2">
                  <span className="w-32 font-semibold text-slate-600">Bobot Syahadah Akhir (%)</span>
                  <input type="number" min={0} max={100} value={newBobot} onChange={(e) => setNewBobot(Number(e.target.value))} className="rounded border-slate-200 p-1 flex-1 outline-none bg-slate-50" />
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddMapel}
                  className="flex-1 rounded-xl bg-emerald-600 py-2 text-sm font-bold text-white hover:bg-emerald-700 transition"
                >
                  Simpan Mapel
                </button>
                <button
                  onClick={() => { 
                    setAddingMapel(false); 
                    setNewMapelIndo(""); 
                    setNewMapelArab(""); 
                    setNewJumlahTes(3);
                    setNewTampilSyahadah(true);
                    setNewMasukAkumulasi(true);
                    setNewBobot(1);
                    setNewBobotUsbu(1);
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 transition"
                >
                  Batal
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingMapel(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-200 py-2.5 text-sm font-semibold text-emerald-600 hover:border-emerald-400 hover:bg-emerald-50 transition"
            >
              <Plus className="h-4 w-4" /> Tambah Mapel
            </button>
          )}

          {/* Hapus program */}
          {canDelete ? (
            <button
              onClick={handleDeleteProgram}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-100 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition"
            >
              <XCircle className="h-3.5 w-3.5" /> Hapus Program Ini
            </button>
          ) : (
            <p className="flex items-center gap-1.5 text-xs text-amber-500 justify-center">
              <AlertTriangle className="h-3.5 w-3.5" />
              Program tidak bisa dihapus karena sudah dipakai santri
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ProgramMapelManager({ initialPrograms }: { initialPrograms: ProgramItem[] }) {
  const router = useRouter();
  const [programs, setPrograms] = useState<ProgramItem[]>(initialPrograms);

  // Form tambah program baru
  const [showAddProgram, setShowAddProgram] = useState(false);
  const [newNamaIndo, setNewNamaIndo] = useState("");
  const [newNamaArab, setNewNamaArab] = useState("");
  const [newKkm, setNewKkm] = useState("60");
  const [addingProgram, setAddingProgram] = useState(false);

  const handleAddProgram = async () => {
    if (!newNamaIndo.trim() || !newNamaArab.trim()) {
      toast.error("Nama program wajib diisi.");
      return;
    }
    setAddingProgram(true);
    const toastId = toast.loading("Menambah program...");
    try {
      const res = await fetch("/api/admin/program", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama_indo: newNamaIndo.trim(), nama_arab: newNamaArab.trim(), kkm: Number(newKkm) }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Gagal menambah program.", { id: toastId });
        return;
      }
      toast.success("Program berhasil ditambahkan!", { id: toastId });
      setNewNamaIndo(""); setNewNamaArab(""); setNewKkm("60");
      setShowAddProgram(false);
      router.refresh();
    } finally {
      setAddingProgram(false);
    }
  };

  const reload = () => router.refresh();

  const handleDeleted = (id: string) => setPrograms((prev) => prev.filter((p) => p.id !== id));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
          {programs.length} Program Aktif
        </p>
        <button
          onClick={() => setShowAddProgram((v) => !v)}
          className="flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 transition"
        >
          <Plus className="h-4 w-4" />
          Tambah Program
        </button>
      </div>

      {/* Form tambah program */}
      {showAddProgram && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 space-y-3">
          <p className="font-bold text-emerald-700">Program Baru</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="text"
              placeholder="Nama (Indonesia) — contoh: Shifr"
              value={newNamaIndo}
              onChange={(e) => setNewNamaIndo(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
            />
            <input
              type="text"
              dir="rtl"
              placeholder="الاسم بالعربية — مثال: صفر"
              value={newNamaArab}
              onChange={(e) => setNewNamaArab(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
            />
            <div className="sm:col-span-2 flex items-center gap-3">
              <label className="text-sm font-semibold text-slate-600 whitespace-nowrap">KKM :</label>
              <input
                type="number"
                min={0} max={100}
                value={newKkm}
                onChange={(e) => setNewKkm(e.target.value)}
                className="w-24 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-center font-bold outline-none focus:border-emerald-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddProgram}
              disabled={addingProgram}
              className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60 transition"
            >
              {addingProgram ? "Menyimpan..." : "Simpan Program"}
            </button>
            <button
              onClick={() => setShowAddProgram(false)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100 transition"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Grid program cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {programs.map((p) => (
          <ProgramCard
            key={p.id}
            program={p}
            onDeleted={handleDeleted}
            onReload={reload}
          />
        ))}
      </div>
    </div>
  );
}
