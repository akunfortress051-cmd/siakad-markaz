"use client";

import { useEffect, useState } from "react";
import {
  Shield,
  Calendar,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Timer,
  FileText,
} from "lucide-react";

type PerizinanItem = {
  id: string;
  nomorTasrih: string;
  tipeIzin: string;
  alasan: string;
  tanggalMulai: string;
  tanggalSelesai: string | null;
  statusIzin: string;
  tanggalKembali: string | null;
  statusAbsen: string;
  createdAt: string;
};

type RiwayatData = {
  id: string;
  dufahNama: string;
  perizinan: PerizinanItem[];
};

const tipeLabel: Record<string, string> = {
  HARIAN: "Harian",
  BERHARI_HARI: "Berhari-hari",
  KELUAR_PARE: "Keluar Pare",
};

const statusConfig: Record<string, { color: string; bg: string; label: string; icon: any }> = {
  MENUNGGU: { color: "var(--color-warning)", bg: "var(--color-warning-light)", label: "Menunggu", icon: Timer },
  AKTIF: { color: "var(--color-info)", bg: "#eff6ff", label: "Aktif", icon: AlertCircle },
  SUDAH_KEMBALI: { color: "var(--color-success)", bg: "var(--color-success-light)", label: "Sudah Kembali", icon: CheckCircle },
  SELESAI: { color: "var(--color-text-muted)", bg: "var(--color-surface-light)", label: "Selesai", icon: CheckCircle },
  DITOLAK: { color: "var(--color-danger)", bg: "var(--color-danger-light)", label: "Ditolak", icon: XCircle },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export default function SantriPerizinanPage() {
  const [riwayat, setRiwayat] = useState<RiwayatData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDufah, setActiveDufah] = useState(0);

  useEffect(() => {
    fetch("/api/santri/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setRiwayat(d.riwayat);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 border-3 rounded-full animate-spin" style={{ borderColor: "var(--color-primary-100)", borderTopColor: "var(--color-primary)" }} />
      </div>
    );
  }

  const allPerizinan = riwayat.flatMap((r) =>
    r.perizinan.map((p) => ({ ...p, dufahNama: r.dufahNama }))
  );

  if (allPerizinan.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>Riwayat Perizinan</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>Status izin dan tasrih</p>
        </div>
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
          <Shield size={32} style={{ color: "var(--color-text-subtle)" }} />
          <p className="text-sm font-semibold" style={{ color: "var(--color-text-muted)" }}>Belum ada riwayat perizinan</p>
        </div>
      </div>
    );
  }

  const current = riwayat[activeDufah];
  const perizinanList = current?.perizinan ?? [];

  // Stats
  const totalIzin = perizinanList.length;
  const aktifCount = perizinanList.filter((p) => p.statusIzin === "AKTIF" || p.statusIzin === "MENUNGGU").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>Riwayat Perizinan</h1>
        <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>Status izin dan tasrih</p>
      </div>

      {/* Dufah Selector */}
      {riwayat.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {riwayat.map((r, i) => (
            <button
              key={r.id}
              onClick={() => setActiveDufah(i)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${i === activeDufah ? "" : "neu-button"}`}
              style={i === activeDufah ? { background: "var(--color-primary)", color: "#fff", boxShadow: "3px 3px 8px rgba(0,102,102,0.3)" } : { color: "var(--color-text-muted)" }}
            >
              {r.dufahNama}
            </button>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="neu-card-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={14} style={{ color: "var(--color-primary)" }} />
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Total Izin</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>{totalIzin}</p>
        </div>
        <div className="neu-card-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={14} style={{ color: "var(--color-info)" }} />
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Sedang Aktif</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: aktifCount > 0 ? "var(--color-info)" : "var(--color-text)" }}>{aktifCount}</p>
        </div>
      </div>

      {/* Perizinan List */}
      <div className="space-y-3">
        {perizinanList.length === 0 ? (
          <div className="neu-card p-8 text-center">
            <p className="text-xs" style={{ color: "var(--color-text-subtle)" }}>Tidak ada perizinan di duf&apos;ah ini</p>
          </div>
        ) : (
          perizinanList.map((p) => {
            const cfg = statusConfig[p.statusIzin] || statusConfig.SELESAI;
            const StatusIcon = cfg.icon;

            return (
              <div key={p.id} className="neu-card p-4 space-y-3">
                {/* Top Row */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold" style={{ color: "var(--color-text)" }}>
                      {p.nomorTasrih}
                    </p>
                    <span
                      className="inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
                      style={{
                        background: p.tipeIzin === "KELUAR_PARE" ? "var(--color-danger-light)" : "var(--color-primary-50)",
                        color: p.tipeIzin === "KELUAR_PARE" ? "var(--color-danger)" : "var(--color-primary)",
                      }}
                    >
                      {tipeLabel[p.tipeIzin] || p.tipeIzin}
                    </span>
                  </div>
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold"
                    style={{ background: cfg.bg, color: cfg.color }}
                  >
                    <StatusIcon size={12} />
                    {cfg.label}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                    <Calendar size={12} style={{ color: "var(--color-text-subtle)" }} />
                    <span>
                      {formatDate(p.tanggalMulai)}
                      {p.tanggalSelesai && ` - ${formatDate(p.tanggalSelesai)}`}
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                    <FileText size={12} className="flex-shrink-0 mt-0.5" style={{ color: "var(--color-text-subtle)" }} />
                    <span>{p.alasan}</span>
                  </div>
                  {p.tanggalKembali && (
                    <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--color-success)" }}>
                      <CheckCircle size={12} />
                      <span>Kembali: {formatDate(p.tanggalKembali)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--color-text-subtle)" }}>
                    <Clock size={12} />
                    <span>Dicatat: {formatDate(p.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
