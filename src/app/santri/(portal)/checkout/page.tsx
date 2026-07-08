"use client";

import { useEffect, useState } from "react";
import { DoorOpen, CheckCircle, Clock, XCircle, Send, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function SantriCheckoutPage() {
  const [loading, setLoading] = useState(true);
  const [pengajuan, setPengajuan] = useState<any>(null);
  const [alasan, setAlasan] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const res = await fetch("/api/santri/checkout");
      const data = await res.json();
      if (res.ok) {
        setPengajuan(data.pengajuan);
      } else {
        toast.error(data.error || "Gagal memuat data");
      }
    } catch (e) {
      toast.error("Terjadi kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!alasan.trim()) {
      toast.error("Alasan harus diisi");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/santri/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alasan })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success("Pengajuan berhasil dikirim!");
        setPengajuan(data.pengajuan);
      } else {
        toast.error(data.error || "Gagal mengirim pengajuan");
      }
    } catch (e) {
      toast.error("Terjadi kesalahan jaringan");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-3 bg-[var(--color-primary-50)] text-[var(--color-primary)] rounded-xl border border-[var(--color-primary-100)]">
          <DoorOpen size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-[var(--color-text)]">Pengajuan Check Out</h1>
          <p className="text-sm font-medium text-[var(--color-text-subtle)] mt-0.5">
            Ajukan permohonan check out permanen dari asrama / program
          </p>
        </div>
      </div>

      {!pengajuan || pengajuan.status === "DIBATALKAN" ? (
        <div className="neu-card-white p-6 md:p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <DoorOpen size={180} className="transform translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform duration-700" />
          </div>

          <div className="relative z-10 max-w-xl">
            <h2 className="text-lg font-bold text-[var(--color-text)] mb-2">Formulir Check Out</h2>
            <p className="text-sm text-[var(--color-text-muted)] mb-6">
              Silakan tuliskan alasan lengkap Anda mengajukan check out. Pengajuan ini akan diteruskan ke pihak terkait untuk disetujui.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-[var(--color-text-muted)] mb-1.5 ml-1">Alasan Check Out</label>
                <textarea
                  value={alasan}
                  onChange={(e) => setAlasan(e.target.value)}
                  className="neu-input w-full rounded-xl resize-none p-3 text-sm focus:border-[var(--color-primary)] focus:ring-[var(--color-primary-50)] transition"
                  rows={4}
                  placeholder="Ceritakan secara ringkas..."
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white px-5 py-3 rounded-xl font-bold text-sm shadow-md transition disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                  ) : (
                    <>
                      Kirim Pengajuan
                      <Send size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className={`p-5 rounded-2xl border flex items-start gap-4 ${
            pengajuan.status === "DISETUJUI" ? "bg-emerald-50 border-emerald-200" :
            pengajuan.status === "DITOLAK" ? "bg-red-50 border-red-200" :
            "bg-blue-50 border-blue-200"
          }`}>
            <div className={`p-2 rounded-xl mt-0.5 ${
              pengajuan.status === "DISETUJUI" ? "bg-emerald-100 text-emerald-600" :
              pengajuan.status === "DITOLAK" ? "bg-red-100 text-red-600" :
              "bg-blue-100 text-blue-600"
            }`}>
              {pengajuan.status === "DISETUJUI" ? <CheckCircle size={24} /> :
               pengajuan.status === "DITOLAK" ? <XCircle size={24} /> :
               <Clock size={24} />}
            </div>
            
            <div className="flex-1">
              <h3 className={`text-base font-bold ${
                pengajuan.status === "DISETUJUI" ? "text-emerald-800" :
                pengajuan.status === "DITOLAK" ? "text-red-800" :
                "text-blue-800"
              }`}>
                Status Pengajuan: {pengajuan.status}
              </h3>
              <p className={`text-sm mt-1 ${
                pengajuan.status === "DISETUJUI" ? "text-emerald-700" :
                pengajuan.status === "DITOLAK" ? "text-red-700" :
                "text-blue-700"
              }`}>
                {pengajuan.status === "DISETUJUI" ? "Semua pihak telah menyetujui. Anda resmi check out." :
                 pengajuan.status === "DITOLAK" ? "Pengajuan check out Anda ditolak. Silakan hubungi admin." :
                 "Sedang menunggu persetujuan dari pihak terkait."}
              </p>

              <div className="mt-4 pt-4 border-t border-black/5">
                <p className="text-xs font-bold uppercase tracking-wider text-black/40 mb-1">Alasan Anda:</p>
                <p className="text-sm text-black/70 font-medium italic">"{pengajuan.alasan}"</p>
              </div>
            </div>
          </div>

          <div className="neu-card-white p-5">
            <h4 className="font-bold text-[var(--color-text)] mb-4 text-sm flex items-center gap-2">
              <AlertTriangle size={16} className="text-[var(--color-warning)]" />
              Proses Persetujuan
            </h4>
            
            <div className="space-y-3">
              {pengajuan.approvals.map((approval: any, index: number) => (
                <div key={approval.id} className="flex items-center justify-between p-3 rounded-xl border border-[var(--color-surface-dark)] bg-[var(--color-secondary)]">
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-[var(--color-text)]">
                      {index + 1}. <span className="font-bold">{approval.user?.nama}</span> <span className="text-[11px] text-[var(--color-text-subtle)] ml-1">({approval.label})</span>
                    </div>
                  </div>
                  <div className={`px-2.5 py-1 rounded-md text-[11px] font-black tracking-wide border flex items-center gap-1.5 ${
                    approval.status === 'DISETUJUI' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                    approval.status === 'DITOLAK' ? 'bg-red-50 text-red-700 border-red-200' :
                    'bg-[var(--color-surface)] text-[var(--color-text-subtle)] border-[var(--color-surface-dark)]'
                  }`}>
                    {approval.status === 'DISETUJUI' && <CheckCircle size={12} />}
                    {approval.status === 'DITOLAK' && <XCircle size={12} />}
                    {approval.status === 'MENUNGGU' && <Clock size={12} />}
                    {approval.status}
                  </div>
                </div>
              ))}
            </div>
            {pengajuan.status === "DITOLAK" && (
                <div className="mt-4 text-center">
                    <button onClick={() => setPengajuan({ ...pengajuan, status: "DIBATALKAN" })} className="text-xs font-bold text-[var(--color-primary)] hover:underline">
                        Buat Pengajuan Baru
                    </button>
                    <p className="text-[10px] text-[var(--color-text-subtle)] mt-1">Pengajuan lama akan diarsipkan (hanya secara visual di perangkat ini).</p>
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
