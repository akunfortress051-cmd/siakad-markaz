"use client";

import { useEffect, useState } from "react";
import {
  CalendarCheck,
  Home,
  Activity,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  MinusCircle,
  Users,
} from "lucide-react";

type RekapData = { hadir: number; izin: number; sakit: number; alpha: number; total: number };
type AbsenKelas = { tanggal: string; sesi: string; status: string; keterangan: string | null };
type AbsenSakan = { tanggal: string; status: string; keterangan: string | null };
type AbsenKegiatan = { tanggal: string; status: string; namaKegiatan: string; keterangan: string | null };
type AbsenTabirot = { tanggal: string; status: string; namaKelompok: string; keterangan: string | null };

type RiwayatData = {
  id: string;
  dufahNama: string;
  programNama: string;
  kelasNama: string;
  rekapAbsenKelas: RekapData;
  rekapAbsenSakan: RekapData;
  rekapAbsenKegiatan: RekapData;
  rekapAbsenTabirot: RekapData;
  absenKelas: AbsenKelas[];
  absenSakan: AbsenSakan[];
  absenKegiatan: AbsenKegiatan[];
  absenTabirot: AbsenTabirot[];
  rekapUsbu: Array<{
    usbu: number;
    hadir: number;
    izin: number;
    sakit: number;
    alpha: number;
    rataRata: number | null;
  }>;
};

const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  HADIR: { icon: CheckCircle, color: "var(--color-success)", bg: "var(--color-success-light)", label: "Hadir" },
  IZIN: { icon: AlertCircle, color: "var(--color-info)", bg: "#eff6ff", label: "Izin" },
  SAKIT: { icon: MinusCircle, color: "var(--color-warning)", bg: "var(--color-warning-light)", label: "Sakit" },
  ALPHA: { icon: XCircle, color: "var(--color-danger)", bg: "var(--color-danger-light)", label: "Alpha" },
};

function RekapCard({ label, rekap }: { label: string; rekap: RekapData }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {(["hadir", "izin", "sakit", "alpha"] as const).map((key) => {
        const cfg = statusConfig[key.toUpperCase()];
        return (
          <div
            key={key}
            className="rounded-xl p-3 text-center"
            style={{ background: cfg.bg, boxShadow: "var(--shadow-inset-sm)" }}
          >
            <p className="text-lg font-bold" style={{ color: cfg.color }}>
              {rekap[key]}
            </p>
            <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: cfg.color }}>
              {cfg.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function formatSesi(s: string) {
  return s.replace("SESI_", "Sesi ");
}

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] || statusConfig.ALPHA;
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

export default function SantriAbsensiPage() {
  const [riwayat, setRiwayat] = useState<RiwayatData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDufah, setActiveDufah] = useState(0);
  const [activeTab, setActiveTab] = useState<"kelas" | "sakan" | "kegiatan" | "tabirot">("kelas");
  const [showDetail, setShowDetail] = useState(false);

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

  if (riwayat.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <CalendarCheck size={32} style={{ color: "var(--color-text-subtle)" }} />
        <p className="text-sm font-semibold" style={{ color: "var(--color-text-muted)" }}>Belum ada data absensi</p>
      </div>
    );
  }

  const current = riwayat[activeDufah];
  if (!current) return null;

  const tabs = [
    { key: "kelas" as const, label: "Kelas", icon: CalendarCheck, rekap: current.rekapAbsenKelas },
    { key: "sakan" as const, label: "Sakan", icon: Home, rekap: current.rekapAbsenSakan },
    { key: "kegiatan" as const, label: "Kegiatan", icon: Activity, rekap: current.rekapAbsenKegiatan },
    { key: "tabirot" as const, label: "Ta'birot", icon: Users, rekap: current.rekapAbsenTabirot },
  ];

  const currentTab = tabs.find((t) => t.key === activeTab)!;

  const detailData =
    activeTab === "kelas"
      ? current.absenKelas
      : activeTab === "sakan"
        ? current.absenSakan
        : activeTab === "kegiatan"
          ? current.absenKegiatan
          : current.absenTabirot;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>Rekap Absensi</h1>
        <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>Detail kehadiran kelas, sakan & kegiatan</p>
      </div>

      {/* Dufah Selector */}
      {riwayat.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {riwayat.map((r, i) => (
            <button
              key={r.id}
              onClick={() => { setActiveDufah(i); setShowDetail(false); }}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${i === activeDufah ? "" : "neu-button"}`}
              style={i === activeDufah ? { background: "var(--color-primary)", color: "#fff", boxShadow: "3px 3px 8px rgba(0,102,102,0.3), -2px -2px 6px rgba(0,133,133,0.15)" } : { color: "var(--color-text-muted)" }}
            >
              {r.dufahNama}
            </button>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="neu-card p-1.5 flex gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setShowDetail(false); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all"
              style={
                isActive
                  ? { background: "#fff", color: "var(--color-primary)", boxShadow: "var(--shadow-raised-sm)" }
                  : { color: "var(--color-text-muted)" }
              }
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Rekap */}
      <div className="neu-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
            Rekap {currentTab.label}
          </h3>
          <span className="text-[10px] font-semibold" style={{ color: "var(--color-text-subtle)" }}>
            Total: {currentTab.rekap.total} hari
          </span>
        </div>
        <RekapCard label={currentTab.label} rekap={currentTab.rekap} />

        {/* Percentage bar */}
        {currentTab.rekap.total > 0 && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-bold" style={{ color: "var(--color-text-muted)" }}>
              <span>Persentase Kehadiran</span>
              <span style={{ color: "var(--color-success)" }}>
                {Math.round((currentTab.rekap.hadir / currentTab.rekap.total) * 100)}%
              </span>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "var(--color-surface-dark)" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(currentTab.rekap.hadir / currentTab.rekap.total) * 100}%`,
                  background: "linear-gradient(90deg, var(--color-primary), var(--color-success))",
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Rekap per Usbu */}
      {activeTab === "kelas" && current.rekapUsbu.length > 0 && (
        <div className="neu-card overflow-hidden">
          <div className="p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
              Rekap per Usbu
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "var(--color-primary-50)" }}>
                  <th className="text-left py-2.5 px-4 font-bold" style={{ color: "var(--color-text-muted)" }}>Usbu</th>
                  <th className="text-center py-2.5 px-3 font-bold" style={{ color: "var(--color-success)" }}>H</th>
                  <th className="text-center py-2.5 px-3 font-bold" style={{ color: "var(--color-info)" }}>I</th>
                  <th className="text-center py-2.5 px-3 font-bold" style={{ color: "var(--color-warning)" }}>S</th>
                  <th className="text-center py-2.5 px-3 font-bold" style={{ color: "var(--color-danger)" }}>A</th>
                  <th className="text-center py-2.5 px-3 font-bold" style={{ color: "var(--color-primary)" }}>Rata-rata</th>
                </tr>
              </thead>
              <tbody>
                {current.rekapUsbu.map((u) => (
                  <tr key={u.usbu} style={{ borderBottom: "1px solid var(--color-surface-dark)" }}>
                    <td className="py-2.5 px-4 font-bold" style={{ color: "var(--color-text)" }}>Usbu {u.usbu}</td>
                    <td className="text-center py-2.5 px-3 font-semibold" style={{ color: "var(--color-success)" }}>{u.hadir}</td>
                    <td className="text-center py-2.5 px-3 font-semibold" style={{ color: "var(--color-info)" }}>{u.izin}</td>
                    <td className="text-center py-2.5 px-3 font-semibold" style={{ color: "var(--color-warning)" }}>{u.sakit}</td>
                    <td className="text-center py-2.5 px-3 font-semibold" style={{ color: "var(--color-danger)" }}>{u.alpha}</td>
                    <td className="text-center py-2.5 px-3 font-bold" style={{ color: "var(--color-primary)" }}>
                      {u.rataRata !== null ? u.rataRata.toFixed(1) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Histori */}
      <div className="neu-card overflow-hidden">
        <button
          onClick={() => setShowDetail(!showDetail)}
          className="w-full p-4 flex items-center justify-between"
        >
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
            Rincian per Tanggal
          </h3>
          {showDetail ? (
            <ChevronUp size={16} style={{ color: "var(--color-text-subtle)" }} />
          ) : (
            <ChevronDown size={16} style={{ color: "var(--color-text-subtle)" }} />
          )}
        </button>
        {showDetail && (
          <div className="px-4 pb-4 space-y-2 max-h-[400px] overflow-y-auto">
            {detailData.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: "var(--color-text-subtle)" }}>
                Belum ada data
              </p>
            ) : (
              detailData.map((item: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: "var(--color-surface-light)", boxShadow: "var(--shadow-inset-sm)" }}
                >
                  <div>
                    <p className="text-xs font-bold" style={{ color: "var(--color-text)" }}>
                      {formatDate(item.tanggal)}
                      {item.sesi && (
                        <span className="font-normal ml-1.5" style={{ color: "var(--color-text-muted)" }}>
                          {formatSesi(item.sesi)}
                        </span>
                      )}
                      {item.namaKegiatan && (
                        <span className="font-normal ml-1.5" style={{ color: "var(--color-text-muted)" }}>
                          {item.namaKegiatan}
                        </span>
                      )}
                      {item.namaKelompok && (
                        <span className="font-normal ml-1.5" style={{ color: "var(--color-text-muted)" }}>
                          {item.namaKelompok}
                        </span>
                      )}
                    </p>
                    {item.keterangan && (
                      <p className="text-[10px] mt-0.5" style={{ color: "var(--color-text-subtle)" }}>
                        {item.keterangan}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={item.status} />
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
