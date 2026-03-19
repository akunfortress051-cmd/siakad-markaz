"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type DashboardSantri = {
  id: string;
  nama: string;
  gender: string;
  kelasNama: string;
  isAktif: boolean;
};

type KelasItem = {
  id: string;
  nama_indo: string;
  nama_arab: string;
};

export function ManajemenKelasClient({
  santriRows,
  kelasList,
}: {
  santriRows: DashboardSantri[];
  kelasList: KelasItem[];
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [globalKelasId, setGlobalKelasId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState("");

  const filteredSantri = santriRows.filter((s) =>
    s.nama.toLowerCase().includes(search.toLowerCase())
  );

  const toggleAll = () => {
    if (selectedIds.size === filteredSantri.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSantri.map((s) => s.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const assignBatch = async (santriIds: string[], kelasId: string) => {
    try {
      setIsSaving(true);
      const res = await fetch("/api/admin/manajemen-kelas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ santriIds, kelasId }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Gagal menyimpan kelas");
      } else {
        setSelectedIds(new Set());
        setGlobalKelasId("");
        router.refresh();
      }
    } catch (e) {
      alert("Terjadi kesalahan sistem saat menyimpan kelas.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkSubmit = () => {
    if (selectedIds.size === 0) {
      return alert("Pilih minimal satu santri.");
    }
    if (!globalKelasId) {
      return alert("Pilih kelas tujuan.");
    }
    assignBatch(Array.from(selectedIds), globalKelasId);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex-1">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-700">Aksi Massal</p>
          <h3 className="mt-1 text-xl font-bold text-slate-900">Atur Kelas Santri</h3>
          <p className="mt-1 text-sm text-slate-500">Pilih santri dari tabel, tentukan kelasnya, lalu simpan.</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={globalKelasId}
            onChange={(e) => setGlobalKelasId(e.target.value)}
            className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-emerald-500 focus:bg-white"
          >
            <option value="">-- Pilih Kelas --</option>
            {kelasList.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama_indo}
              </option>
            ))}
          </select>
          <button
            onClick={handleBulkSubmit}
            disabled={isSaving || selectedIds.size === 0 || !globalKelasId}
            className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {isSaving ? "Menyimpan..." : "Simpan Terpilih"}
          </button>
        </div>
      </div>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
           <input
             type="text"
             placeholder="Cari nama santri..."
             value={search}
             onChange={(e) => setSearch(e.target.value)}
             className="w-full max-w-sm rounded-full border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-medium outline-none transition focus:border-emerald-500 focus:bg-white"
           />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
              <tr>
                <th className="px-6 py-4">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
                    checked={
                      filteredSantri.length > 0 && selectedIds.size === filteredSantri.length
                    }
                    onChange={toggleAll}
                  />
                </th>
                <th className="px-6 py-4">Santri</th>
                <th className="px-6 py-4">Gender</th>
                <th className="px-6 py-4">Kelas Saat Ini</th>
                <th className="px-6 py-4 w-64 text-right">Ubah Cepat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
              {filteredSantri.map((santri) => (
                <tr key={santri.id} className="align-middle hover:bg-slate-50/80">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
                      checked={selectedIds.has(santri.id)}
                      onChange={() => toggleOne(santri.id)}
                    />
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900">{santri.nama}</td>
                  <td className="px-6 py-4 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">{santri.gender}</td>
                  <td className="px-6 py-4">
                    {santri.kelasNama !== "-" ? (
                      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 font-bold text-slate-700">
                        {santri.kelasNama}
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-rose-50 px-3 py-1 font-bold text-rose-600">
                        Belum Ditempatkan
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          assignBatch([santri.id], e.target.value);
                          e.target.value = "";
                        }
                      }}
                      disabled={isSaving}
                      className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-800 outline-none w-48 transition hover:border-emerald-300 focus:border-emerald-500 uppercase tracking-wide"
                    >
                      <option value="">Edit / Assign...</option>
                      {kelasList.map((k) => (
                         // only show classes different from current class. But wait, we don't have kelasId for the current class in DashboardSantri. That's fine.
                        <option key={k.id} value={k.id}>
                          {k.nama_indo}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {filteredSantri.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    Tidak ditemukan ada santri.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
