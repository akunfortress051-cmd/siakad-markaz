"use client";

import { useState, useEffect } from "react";
import { DoorOpen, CheckCircle, Clock, XCircle, Search, Filter } from "lucide-react";
import toast from "react-hot-toast";

export function CheckoutClient({ currentUser }: { currentUser: any }) {
  const [pengajuanList, setPengajuanList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [filterStatus]);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/checkout?status=${filterStatus}`);
      const data = await res.json();
      if (res.ok) {
        setPengajuanList(data.data);
      } else {
        toast.error(data.error || "Gagal memuat data");
      }
    } catch (e) {
      toast.error("Error jaringan");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(id: string, isApprove: boolean, catatan?: string) {
    if (!confirm(isApprove ? "Setujui pengajuan check out ini?" : "Tolak pengajuan ini?")) return;
    
    setSubmitting(id);
    try {
      const res = await fetch(`/api/admin/checkout/${id}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: isApprove ? "DISETUJUI" : "DITOLAK",
          catatan: catatan || ""
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(isApprove ? "Telah Disetujui" : "Telah Ditolak");
        fetchData(); // refresh list
      } else {
        toast.error(data.error || "Gagal update status");
      }
    } catch (e) {
      toast.error("Error jaringan");
    } finally {
      setSubmitting(null);
    }
  }

  async function handleCancel(id: string) {
    if (!confirm("Batal/Hapus pengajuan ini karena suatu kesalahan? Ini akan mengembalikan status Aktif santri jika sebelumnya sudah check out.")) return;
    setSubmitting(id);
    try {
      const res = await fetch(`/api/admin/checkout/${id}/cancel`, { method: "PUT" });
      const data = await res.json();
      if (res.ok) {
        toast.success("Berhasil dibatalkan");
        fetchData();
      } else {
        toast.error(data.error || "Gagal membatalkan");
      }
    } catch (e) {
      toast.error("Error jaringan");
    } finally {
      setSubmitting(null);
    }
  }

  const filtered = pengajuanList.filter(p => {
    if (!search) return true;
    return p.santri.nama.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[var(--color-primary-50)] text-[var(--color-primary)] rounded-xl border border-[var(--color-primary-100)]">
            <DoorOpen size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-[var(--color-text)]">Pengajuan Check Out</h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
              Kelola persetujuan check out permanen santri.
            </p>
          </div>
        </div>
      </div>

      <div className="neu-card-white p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-[var(--color-text-muted)]">
          <Filter size={16} />
          Filter & Pencarian
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="relative lg:col-span-2">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]" />
            <input
              type="text"
              placeholder="Cari nama santri..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[var(--color-surface-dark)] bg-[var(--color-secondary)] text-sm font-medium focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-50)] transition"
            />
          </div>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)} 
            className="rounded-xl neu-input"
          >
            <option value="ALL">Semua Status</option>
            <option value="MENUNGGU">Menunggu Persetujuan</option>
            <option value="DISETUJUI">DiSetujui</option>
            <option value="DITOLAK">Ditolak</option>
            <option value="DIBATALKAN">Dibatalkan</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-10">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 neu-card-white">
            <DoorOpen size={48} className="mx-auto text-[var(--color-text-subtle)] mb-3" />
            <p className="font-bold text-[var(--color-text-muted)]">Tidak ada pengajuan</p>
          </div>
        ) : (
          filtered.map(p => {
             const isComplete = p.status === "DISETUJUI";
             const isRejected = p.status === "DITOLAK";
             const isCancelled = p.status === "DIBATALKAN";

             // Check if I am an approver who hasn't approved yet
             const myApproval = p.approvals.find((a: any) => a.userId === currentUser.userId);
             const canApprove = myApproval && myApproval.status === "MENUNGGU" && !isCancelled;

             const bg = isComplete ? "bg-emerald-50 border-emerald-200" :
                        isRejected ? "bg-red-50 border-red-200" :
                        isCancelled ? "bg-gray-50 border-gray-200" :
                        "bg-white border-[var(--color-surface-dark)]";

             return (
               <div key={p.id} className={`p-5 rounded-2xl border shadow-sm ${bg}`}>
                 <div className="flex flex-col lg:flex-row justify-between gap-4">
                   <div className="flex-1">
                     <div className="flex items-center gap-2 mb-2">
                       <span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-lg border ${
                         isComplete ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                         isRejected ? "bg-red-100 text-red-700 border-red-200" :
                         isCancelled ? "bg-gray-200 text-gray-700 border-gray-300" :
                         "bg-blue-50 text-blue-700 border-blue-200"
                       }`}>
                         {p.status}
                       </span>
                       <span className="text-xs font-semibold text-[var(--color-text-muted)]">
                         {new Date(p.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                       </span>
                     </div>
                     <h3 className="text-lg font-black text-[var(--color-text)] leading-tight">{p.santri.nama}</h3>
                     <p className="text-xs font-bold text-[var(--color-text-subtle)] mt-1">
                       {p.santri.kategori} • {p.santri.sakan} ({p.santri.kamar}) • Program: {p.riwayat?.program?.nama_indo}
                     </p>
                     
                     <div className="mt-3 p-3 bg-white rounded-xl border border-[var(--color-surface-dark)]">
                       <p className="text-xs font-bold text-[var(--color-text-muted)] mb-1 uppercase tracking-wider">Alasan:</p>
                       <p className="text-sm font-medium italic text-[var(--color-text)]">"{p.alasan}"</p>
                     </div>
                   </div>

                   <div className="flex-1 lg:max-w-md">
                     <div className="neu-inset p-3 rounded-xl space-y-2">
                       <h4 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Pihak Penyetuju:</h4>
                       {p.approvals.map((a: any, i: number) => (
                         <div key={a.id} className="flex justify-between items-center text-sm font-semibold">
                           <span className="text-[var(--color-text)]">{i+1}. <span className="font-bold">{a.user.nama}</span> <span className="text-[11px] text-[var(--color-text-subtle)] font-normal ml-1">({a.label})</span></span>
                           {a.status === "DISETUJUI" ? <CheckCircle size={14} className="text-emerald-500" /> :
                            a.status === "DITOLAK" ? <XCircle size={14} className="text-red-500" /> :
                            <Clock size={14} className="text-amber-500" />}
                         </div>
                       ))}
                     </div>

                     <div className="flex gap-2 mt-4 justify-end">
                       {(currentUser.role === 'ADMIN' || currentUser.permissions?.includes('checkout_admin')) && !isCancelled && (
                         <button 
                           onClick={() => handleCancel(p.id)}
                           disabled={submitting === p.id}
                           className="px-4 py-2 text-xs font-bold text-[var(--color-danger)] bg-[var(--color-danger-light)] rounded-xl hover:bg-[var(--color-danger)] hover:text-white transition"
                         >
                           Batalkan
                         </button>
                       )}

                       {canApprove && (
                         <>
                           <button 
                             onClick={() => handleApprove(p.id, false)}
                             disabled={submitting === p.id}
                             className="px-4 py-2 text-xs font-bold text-red-700 bg-red-100 rounded-xl hover:bg-red-200 transition"
                           >
                             Tolak
                           </button>
                           <button 
                             onClick={() => handleApprove(p.id, true)}
                             disabled={submitting === p.id}
                             className="px-6 py-2 text-xs font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition"
                           >
                             {submitting === p.id ? "Memproses..." : "Setujui"}
                           </button>
                         </>
                       )}
                     </div>
                   </div>
                 </div>
               </div>
             )
          })
        )}
      </div>
    </div>
  );
}
