"use client";

import { useState, useEffect } from "react";
import { Loader2, Search, CheckCircle, XCircle, FileText, Check, AlertTriangle, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import TasrihModal, { TasrihDetail } from "./tasrih-modal";

type Perizinan = {
  id: string;
  tipeIzin: string;
  alasan: string;
  tanggalMulai: string;
  tanggalSelesai: string | null;
  statusIzin: string;
  tanggalKembali: string | null;
  nomorTasrih: string;
  createdAt: string;
  riwayat: {
    santri: { nama: string };
    kelas: { nama: string } | null;
  };
  batasJam?: number;
  petugasNama?: string | null;
};

export default function PerizinanDataClient({ permissions }: { permissions: string[] }) {
  const isAdmin = permissions.includes("*");
  const canEdit = isAdmin || permissions.includes("perizinan_data_edit");
  const canDelete = isAdmin;

  const [data, setData] = useState<Perizinan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTipe, setFilterTipe] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");

  const [selectedTasrih, setSelectedTasrih] = useState<TasrihDetail | null>(null);

  useEffect(() => {
    fetchData();
  }, [filterTipe, filterStatus]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/perizinan?tipe=${filterTipe}&status=${filterStatus}`);
      if (!res.ok) throw new Error("Gagal load data");
      const json = await res.json();
      setData(json);
    } catch (error) {
      toast.error("Gagal memuat data perizinan");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (id: string, action: "APPROVE" | "REJECT" | "KONFIRMASI" | "DELETE") => {
    if (action === "DELETE" && !confirm("Yakin ingin menghapus izin ini? Absensi yang sudah di-set akan di-rollback.")) return;
    if (action === "KONFIRMASI" && !confirm("Konfirmasi santri sudah kembali?")) return;
    if (action === "REJECT" && !confirm("Tolak request izin ini?")) return;

    try {
      let res;
      if (action === "DELETE") {
        res = await fetch(`/api/admin/perizinan/${id}`, { method: "DELETE" });
      } else if (action === "KONFIRMASI") {
        res = await fetch(`/api/admin/perizinan/${id}/konfirmasi`, { method: "POST" });
      } else {
        const newStatus = action === "APPROVE" ? "AKTIF" : "DITOLAK";
        res = await fetch(`/api/admin/perizinan/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ statusIzin: newStatus })
        });
      }

      if (!res.ok) throw new Error("Gagal melakukan aksi");
      toast.success("Aksi berhasil");
      fetchData();
    } catch (error) {
      toast.error("Terjadi kesalahan");
    }
  };

  const viewTasrih = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/perizinan/${id}`);
      if (!res.ok) throw new Error("Gagal load tasrih");
      const json = await res.json();
      setSelectedTasrih(json);
    } catch (error) {
      toast.error("Gagal memuat detail tasrih");
    }
  };

  const filteredData = data.filter(d => {
    if (search && !d.riwayat.santri.nama.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getStatusBadge = (status: string, d: Perizinan) => {
    if (status === "MENUNGGU") return <span className="px-2 py-1 text-xs font-bold rounded-lg bg-yellow-100 text-yellow-800 border border-yellow-200">⏳ Menunggu</span>;
    if (status === "DITOLAK") return <span className="px-2 py-1 text-xs font-bold rounded-lg bg-red-100 text-red-800 border border-red-200">❌ Ditolak</span>;
    if (status === "SUDAH_KEMBALI") return <span className="px-2 py-1 text-xs font-bold rounded-lg bg-green-100 text-green-800 border border-green-200">🟢 Sudah Kembali</span>;
    if (status === "SELESAI") return <span className="px-2 py-1 text-xs font-bold rounded-lg bg-slate-100 text-slate-800 border border-slate-200">🏁 Selesai</span>;
    
    // AKTIF
    const today = new Date();
    today.setHours(0,0,0,0);
    const end = d.tanggalSelesai ? new Date(d.tanggalSelesai) : new Date(d.tanggalMulai);
    
    if (end < today && d.tipeIzin !== "HARIAN") {
      return <span className="px-2 py-1 text-xs font-bold rounded-lg bg-red-100 text-red-700 border border-red-200 flex items-center gap-1"><AlertTriangle size={12}/> Belum Kembali</span>;
    }
    
    return <span className="px-2 py-1 text-xs font-bold rounded-lg bg-blue-100 text-blue-800 border border-blue-200">🔵 Aktif</span>;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[var(--color-surface-dark)] p-6">
      <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
        <div className="flex gap-2">
          <select value={filterTipe} onChange={(e) => setFilterTipe(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none">
            <option value="ALL">Semua Tipe</option>
            <option value="HARIAN">Harian</option>
            <option value="BERHARI_HARI">Berhari-hari</option>
            <option value="KELUAR_PARE">Keluar Pare</option>
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none">
            <option value="ALL">Semua Status</option>
            <option value="MENUNGGU">Menunggu</option>
            <option value="AKTIF">Aktif</option>
            <option value="SUDAH_KEMBALI">Sudah Kembali</option>
          </select>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--color-text-subtle)]" />
          <input type="text" placeholder="Cari santri..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-[var(--color-surface-dark)] rounded-xl text-sm" />
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 border-b border-slate-200 text-[var(--color-text-muted)] uppercase text-[10px] font-black tracking-wider">
            <tr>
              <th className="px-4 py-3">Tasrih</th>
              <th className="px-4 py-3">Nama Santri</th>
              <th className="px-4 py-3">Tipe & Tanggal</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-[var(--color-primary)]" /></td></tr>
            ) : filteredData.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--color-text-muted)]">Tidak ada data</td></tr>
            ) : (
              filteredData.map(d => (
                <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-[var(--color-primary-dark)] font-bold">{d.nomorTasrih}</td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-[var(--color-text)]">{d.riwayat.santri.nama}</div>
                    <div className="text-xs text-[var(--color-text-subtle)]">{d.riwayat.kelas?.nama || "Tanpa Kelas"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-[var(--color-text)] text-xs">
                      {d.tipeIzin === "HARIAN" ? "Harian" : d.tipeIzin === "BERHARI_HARI" ? "Berhari-hari" : "Keluar Pare"}
                    </div>
                    <div className="text-xs text-[var(--color-text-subtle)]">
                      {new Date(d.tanggalMulai).toLocaleDateString("id-ID")}
                      {d.tanggalSelesai && ` - ${new Date(d.tanggalSelesai).toLocaleDateString("id-ID")}`}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(d.statusIzin, d)}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => viewTasrih(d.id)} className="p-1.5 text-blue-600 bg-blue-50 rounded hover:bg-blue-100" title="Detail Tasrih"><FileText size={16} /></button>
                    
                    {canEdit && d.statusIzin === "MENUNGGU" && (
                      <>
                        <button onClick={() => handleAction(d.id, "APPROVE")} className="p-1.5 text-green-600 bg-green-50 rounded hover:bg-green-100" title="Setujui"><CheckCircle size={16} /></button>
                        <button onClick={() => handleAction(d.id, "REJECT")} className="p-1.5 text-red-600 bg-red-50 rounded hover:bg-red-100" title="Tolak"><XCircle size={16} /></button>
                      </>
                    )}
                    
                    {canEdit && d.statusIzin === "AKTIF" && d.tipeIzin !== "HARIAN" && (
                      <button onClick={() => handleAction(d.id, "KONFIRMASI")} className="p-1.5 text-emerald-600 bg-emerald-50 rounded hover:bg-emerald-100" title="Konfirmasi Kehadiran (Kembali)"><Check size={16} /></button>
                    )}

                    {canDelete && (
                      <button onClick={() => handleAction(d.id, "DELETE")} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Hapus Izin"><Trash2 size={16} /></button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* TASRIH MODAL */}
      {selectedTasrih && (
        <TasrihModal tasrih={selectedTasrih} onClose={() => setSelectedTasrih(null)} />
      )}
    </div>
  );
}
