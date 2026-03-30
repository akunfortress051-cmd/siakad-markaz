"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X, Save, AlertCircle, Check, Loader2 } from "lucide-react";

type ProgramItem = {
  id: string;
  nama_indo: string;
  nama_arab: string;
  kelasList: Array<{
    id: string;
    nama: string;
  }>;
};

// ─── Inline Add Row ─────────────────────────────────────────────────────────

function InlineAddKelas({ programId, programNama, onSaved }: {
  programId: string;
  programNama: string;
  onSaved: () => void;
}) {
  const [names, setNames] = useState<string[]>([""]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const addRow = () => setNames((prev) => [...prev, ""]);
  const removeRow = (i: number) => setNames((prev) => prev.filter((_, idx) => idx !== i));
  const updateRow = (i: number, v: string) => setNames((prev) => prev.map((n, idx) => idx === i ? v : n));

  const handleSave = async () => {
    const valid = names.map((n) => n.trim()).filter(Boolean);
    if (valid.length === 0) { setErrors(["Minimal satu nama kelas."]) ; return; }
    setLoading(true);
    setErrors([]);
    const errs: string[] = [];
    for (const nama of valid) {
      const res = await fetch("/api/admin/kelas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama, programId }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        errs.push(`"${nama}": ${d?.error || "Gagal"}`);
      }
    }
    setLoading(false);
    if (errs.length > 0) { setErrors(errs); return; }
    onSaved();
  };

  return (
    <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-2">
      <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Tambah Kelas ke {programNama}</p>
      {errors.map((e, i) => (
        <p key={i} className="text-xs text-rose-600 font-medium">{e}</p>
      ))}
      <div className="space-y-2">
        {names.map((name, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => updateRow(i, e.target.value)}
              placeholder={`Contoh: ${programNama} ${String.fromCharCode(65 + i)}`}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
              onKeyDown={(e) => e.key === "Enter" && i === names.length - 1 && addRow()}
            />
            {names.length > 1 && (
              <button onClick={() => removeRow(i)} className="text-slate-400 hover:text-rose-500 transition">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Tombol + tambah baris berikutnya */}
      <button
        onClick={addRow}
        className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 py-1 transition"
      >
        <Plus className="h-3.5 w-3.5" />
        + Tambah kelas lagi
      </button>

      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60 transition"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Simpan
        </button>
        <button
          onClick={() => { setNames([""]); setErrors([]); onSaved(); }}
          className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 transition"
        >
          Batal
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function KelasClient({ programList }: { programList: ProgramItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formNama, setFormNama] = useState("");
  const [formProgramId, setFormProgramId] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Inline add state per program
  const [inlineAddProgramId, setInlineAddProgramId] = useState<string | null>(null);

  const openEditModal = (id: string, nama: string, programId: string) => {
    setModalMode("edit");
    setEditingId(id);
    setFormNama(nama);
    setFormProgramId(programId);
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const activeIndo = programList.find((p) => p.id === formProgramId)?.nama_indo || "Kelas";

  const handleSave = async () => {
    if (!formNama.trim() || !formProgramId) {
      setErrorMsg("Nama dan Program wajib diisi.");
      return;
    }
    setErrorMsg("");
    startTransition(async () => {
      const res = await fetch("/api/admin/kelas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, nama: formNama, programId: formProgramId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setErrorMsg(data?.error || "Terjadi kesalahan saat menyimpan.");
        return;
      }

      setIsModalOpen(false);
      router.refresh();
    });
  };

  const handleDelete = async (id: string, nama: string) => {
    if (!confirm(`Hapus kelas "${nama}"?`)) return;

    startTransition(async () => {
      const res = await fetch(`/api/admin/kelas?id=${id}`, { method: "DELETE" });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Gagal menghapus.");
        return;
      }

      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {programList.map((program) => (
          <div key={program.id} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-xl font-bold text-slate-900 truncate">{program.nama_indo}</h3>
                <p className="text-sm tracking-wide text-slate-500 truncate">{program.nama_arab}</p>
              </div>
              {/* Tombol + langsung di setiap kartu */}
              <button
                onClick={() =>
                  setInlineAddProgramId((prev) => (prev === program.id ? null : program.id))
                }
                className="shrink-0 flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                Tambah
              </button>
            </div>

            <div className="space-y-2">
              {program.kelasList.length === 0 ? (
                <p className="text-sm italic text-slate-400">Belum ada ruangan</p>
              ) : (
                program.kelasList.map((kelas) => (
                  <div
                    key={kelas.id}
                    className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 border border-slate-100 transition-colors hover:border-slate-300"
                  >
                    <span className="font-semibold text-slate-700">{kelas.nama}</span>
                    <div className="flex items-center gap-1 opacity-60 transition-opacity hover:opacity-100">
                      <button
                        onClick={() => openEditModal(kelas.id, kelas.nama, program.id)}
                        disabled={isPending}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-200 hover:text-emerald-600 disabled:opacity-50"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(kelas.id, kelas.nama)}
                        disabled={isPending}
                        className="rounded-lg p-2 text-slate-500 hover:bg-rose-100 hover:text-rose-600 disabled:opacity-50"
                        title="Hapus"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Inline add form muncul di bawah daftar kelas */}
            {inlineAddProgramId === program.id && (
              <InlineAddKelas
                programId={program.id}
                programNama={program.nama_indo}
                onSaved={() => {
                  setInlineAddProgramId(null);
                  router.refresh();
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-900">Edit Nama Kelas</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {errorMsg && (
                <div className="flex gap-2 rounded-2xl bg-rose-50 p-4 text-sm font-medium text-rose-700 border border-rose-100">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <p>{errorMsg}</p>
                </div>
              )}
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700">Program / Induk</span>
                <select
                  value={formProgramId}
                  onChange={(e) => setFormProgramId(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white"
                >
                  <option value="">-- Pilih Induk Program --</option>
                  {programList.map((p) => (
                    <option key={p.id} value={p.id}>{p.nama_indo}</option>
                  ))}
                </select>
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700">Nama Kelas (Ruangan)</span>
                <input
                  type="text"
                  placeholder={`Contoh: ${activeIndo} A, ${activeIndo} B`}
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white"
                />
              </label>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-200"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending || !formNama || !formProgramId}
                className="flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
              >
                {isPending ? <span>Menyimpan...</span> : <><Save className="h-4 w-4" /><span>Simpan</span></>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
