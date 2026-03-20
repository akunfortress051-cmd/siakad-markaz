"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { Plus, Trash2, Pencil, Check, X, ToggleLeft, ToggleRight } from "lucide-react";

type Kegiatan = {
  id: string;
  nama: string;
  aktif: boolean;
};

export function PengaturanKegiatanClient({ initialList }: { initialList: Kegiatan[] }) {
  const [list, setList] = useState<Kegiatan[]>(initialList);
  const [newNama, setNewNama] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editNama, setEditNama] = useState("");

  const handleAdd = async () => {
    if (!newNama.trim()) return;
    setIsAdding(true);
    try {
      const res = await fetch("/api/admin/absensi/kegiatan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama: newNama }),
      });
      const data = await res.json();
      if (data.success) {
        setList((prev) => [...prev, data.kegiatan].sort((a, b) => a.nama.localeCompare(b.nama, "id")));
        setNewNama("");
        toast.success(`Kegiatan "${data.kegiatan.nama}" berhasil ditambahkan`);
      } else {
        toast.error(data.error ?? "Gagal menambahkan kegiatan");
      }
    } catch (e) {
      toast.error("Terjadi kesalahan sistem");
    } finally {
      setIsAdding(false);
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (!editNama.trim()) return;
    try {
      const res = await fetch(`/api/admin/absensi/kegiatan/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama: editNama }),
      });
      const data = await res.json();
      if (data.success) {
        setList((prev) =>
          prev.map((k) => (k.id === id ? { ...k, nama: data.kegiatan.nama } : k))
        );
        setEditId(null);
        toast.success("Nama kegiatan berhasil diubah");
      } else {
        toast.error(data.error ?? "Gagal mengubah kegiatan");
      }
    } catch {
      toast.error("Terjadi kesalahan sistem");
    }
  };

  const handleToggleAktif = async (item: Kegiatan) => {
    try {
      const res = await fetch(`/api/admin/absensi/kegiatan/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aktif: !item.aktif }),
      });
      const data = await res.json();
      if (data.success) {
        setList((prev) =>
          prev.map((k) => (k.id === item.id ? { ...k, aktif: !k.aktif } : k))
        );
        toast.success(`Kegiatan "${item.nama}" ${!item.aktif ? "diaktifkan" : "dinonaktifkan"}`);
      }
    } catch {
      toast.error("Terjadi kesalahan");
    }
  };

  const handleDelete = async (item: Kegiatan) => {
    if (!confirm(`Hapus kegiatan "${item.nama}"? Data absen yang sudah ada akan ikut terhapus.`)) return;
    try {
      const res = await fetch(`/api/admin/absensi/kegiatan/${item.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setList((prev) => prev.filter((k) => k.id !== item.id));
        toast.success(`Kegiatan "${item.nama}" dihapus`);
      } else {
        toast.error(data.error ?? "Gagal menghapus kegiatan");
      }
    } catch {
      toast.error("Terjadi kesalahan sistem");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black text-slate-900 md:text-4xl">
          Pengaturan Kegiatan
        </h1>
        <p className="text-base text-slate-500 max-w-2xl">
          Kelola daftar kategori kegiatan untuk absensi harian. Kegiatan yang tidak aktif tidak akan muncul di menu absen.
        </p>
      </div>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        {/* Add New */}
        <div className="flex flex-col gap-3 border-b border-slate-200 p-6 bg-slate-50/50 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Nama Kegiatan Baru
            </label>
            <input
              type="text"
              placeholder="Contoh: Halaqoh, Tahajud, Muhadhoroh..."
              value={newNama}
              onChange={(e) => setNewNama(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-amber-500"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={isAdding || !newNama.trim()}
            className="flex items-center gap-2 rounded-full bg-amber-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-amber-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {isAdding ? "Menambahkan..." : "Tambah Kegiatan"}
          </button>
        </div>

        {/* List */}
        <ul className="divide-y divide-slate-100">
          {list.length === 0 && (
            <li className="px-6 py-8 text-center text-sm font-medium text-slate-500">
              Belum ada kategori kegiatan. Tambahkan kegiatan pertama Anda di atas!
            </li>
          )}
          {list.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50/50"
            >
              {editId === item.id ? (
                <div className="flex flex-1 items-center gap-3">
                  <input
                    type="text"
                    value={editNama}
                    onChange={(e) => setEditNama(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveEdit(item.id);
                      if (e.key === "Escape") setEditId(null);
                    }}
                    autoFocus
                    className="flex-1 rounded-xl border border-amber-400 bg-amber-50 px-3 py-2 text-sm font-semibold text-slate-900 outline-none"
                  />
                  <button
                    onClick={() => handleSaveEdit(item.id)}
                    className="flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-600"
                  >
                    <Check className="h-3.5 w-3.5" /> Simpan
                  </button>
                  <button
                    onClick={() => setEditId(null)}
                    className="flex items-center gap-1 rounded-full bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-300"
                  >
                    <X className="h-3.5 w-3.5" /> Batal
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <span className={`font-semibold text-slate-900 ${!item.aktif ? "line-through text-slate-400" : ""}`}>
                      {item.nama}
                    </span>
                    {!item.aktif && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">
                        Nonaktif
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => handleToggleAktif(item)}
                      title={item.aktif ? "Nonaktifkan" : "Aktifkan"}
                      className={`rounded-full p-2 transition ${item.aktif ? "text-emerald-600 hover:bg-emerald-50" : "text-slate-400 hover:bg-slate-100"}`}
                    >
                      {item.aktif ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                    </button>
                    <button
                      onClick={() => { setEditId(item.id); setEditNama(item.nama); }}
                      className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="rounded-full p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
