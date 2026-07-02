"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  User,
  BookOpen,
  MapPin,
  FileText,
  CalendarCheck,
  Clock,
  Shield,
  TrendingUp,
  Award,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

type SantriData = {
  santri: {
    id: string;
    nama: string;
    gender: string;
    sakan: string;
    kamar: string;
    nomorLemari: string;
    kategori: string;
    isAktif: boolean;
    tempatLahir: string;
    tanggalLahir: string;
    alamat: string;
  };
  riwayat: Array<{
    id: string;
    dufahNama: string;
    programNama: string;
    kelasNama: string;
    statusKelulusan: string;
    average: number;
    averagePredikat: { indo: string; arab: string };
    rekapAbsenKelas: { hadir: number; total: number };
    rekapAbsenSakan: { hadir: number; total: number };
  }>;
};

export default function SantriDashboardPage() {
  const [data, setData] = useState<SantriData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/santri/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div
          className="h-8 w-8 border-3 rounded-full animate-spin"
          style={{
            borderColor: "var(--color-primary-100)",
            borderTopColor: "var(--color-primary)",
          }}
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <AlertTriangle size={32} style={{ color: "var(--color-warning)" }} />
        <p
          className="text-sm font-semibold"
          style={{ color: "var(--color-text-muted)" }}
        >
          Gagal memuat data
        </p>
      </div>
    );
  }

  const { santri, riwayat } = data;
  const currentRiwayat = riwayat[0]; // most recent dufah

  const statusColor =
    currentRiwayat?.statusKelulusan === "LULUS"
      ? "var(--color-success)"
      : currentRiwayat?.statusKelulusan === "TIDAK_LULUS"
        ? "var(--color-danger)"
        : "var(--color-warning)";

  const statusBg =
    currentRiwayat?.statusKelulusan === "LULUS"
      ? "var(--color-success-light)"
      : currentRiwayat?.statusKelulusan === "TIDAK_LULUS"
        ? "var(--color-danger-light)"
        : "var(--color-warning-light)";

  const statusLabel =
    currentRiwayat?.statusKelulusan === "LULUS"
      ? "Lulus"
      : currentRiwayat?.statusKelulusan === "TIDAK_LULUS"
        ? "Tidak Lulus"
        : "Belum Lengkap";

  const kehadiranKelas =
    currentRiwayat && currentRiwayat.rekapAbsenKelas.total > 0
      ? Math.round(
          (currentRiwayat.rekapAbsenKelas.hadir /
            currentRiwayat.rekapAbsenKelas.total) *
            100
        )
      : 0;

  const kehadiranSakan =
    currentRiwayat && currentRiwayat.rekapAbsenSakan.total > 0
      ? Math.round(
          (currentRiwayat.rekapAbsenSakan.hadir /
            currentRiwayat.rekapAbsenSakan.total) *
            100
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1
          className="text-xl font-bold"
          style={{ color: "var(--color-text)" }}
        >
          Beranda
        </h1>
        <p
          className="text-xs mt-0.5"
          style={{ color: "var(--color-text-muted)" }}
        >
          Selamat datang di SIAKAD Markaz Arabiyah
        </p>
      </div>

      {/* Inactive Banner */}
      {!santri.isAktif && (
        <div
          className="rounded-xl p-4 flex items-start gap-3"
          style={{
            background: "var(--color-warning-light)",
            boxShadow: "var(--shadow-inset-sm)",
          }}
        >
          <AlertTriangle
            size={18}
            className="flex-shrink-0 mt-0.5"
            style={{ color: "var(--color-warning)" }}
          />
          <div>
            <p
              className="text-xs font-bold"
              style={{ color: "var(--color-warning)" }}
            >
              Status Tidak Aktif
            </p>
            <p
              className="text-[11px] mt-0.5"
              style={{ color: "var(--color-text-muted)" }}
            >
              Anda tercatat tidak aktif. Silakan lakukan daftar ulang untuk
              mengaktifkan kembali status santri.
            </p>
          </div>
        </div>
      )}

      {/* Profile Card */}
      <div className="neu-card p-5">
        <div className="flex items-start gap-4">
          <div
            className="flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              background: "var(--color-primary-50)",
              boxShadow: "var(--shadow-inset-sm)",
            }}
          >
            <User size={24} style={{ color: "var(--color-primary)" }} />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              className="text-base font-bold truncate"
              style={{ color: "var(--color-text)" }}
            >
              {santri.nama}
            </h2>
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center gap-2 text-xs">
                <BookOpen
                  size={13}
                  style={{ color: "var(--color-text-subtle)" }}
                />
                <span style={{ color: "var(--color-text-muted)" }}>
                  {currentRiwayat?.programNama ?? "Belum diatur"} /{" "}
                  {currentRiwayat?.kelasNama ?? "-"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <MapPin
                  size={13}
                  style={{ color: "var(--color-text-subtle)" }}
                />
                <span style={{ color: "var(--color-text-muted)" }}>
                  {santri.sakan || "-"} / {santri.kamar || "-"} /{" "}
                  {santri.nomorLemari || "-"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Clock
                  size={13}
                  style={{ color: "var(--color-text-subtle)" }}
                />
                <span style={{ color: "var(--color-text-muted)" }}>
                  Duf&apos;ah: {currentRiwayat?.dufahNama ?? "-"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {currentRiwayat && (
        <div className="grid grid-cols-2 gap-3">
          {/* Rata-rata Nilai */}
          <div className="neu-card-white p-4">
            <div className="flex items-center gap-2 mb-3">
              <div
                className="p-1.5 rounded-lg"
                style={{
                  background: "var(--color-primary-50)",
                  color: "var(--color-primary)",
                }}
              >
                <TrendingUp size={14} />
              </div>
              <span
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: "var(--color-text-muted)" }}
              >
                Rata-rata
              </span>
            </div>
            <p
              className="text-2xl font-bold"
              style={{ color: "var(--color-text)" }}
            >
              {currentRiwayat.average || "-"}
            </p>
            <p
              className="text-[10px] font-semibold mt-0.5"
              style={{ color: "var(--color-primary)" }}
            >
              {currentRiwayat.averagePredikat?.indo || "-"}
            </p>
          </div>

          {/* Status Kelulusan */}
          <div className="neu-card-white p-4">
            <div className="flex items-center gap-2 mb-3">
              <div
                className="p-1.5 rounded-lg"
                style={{ background: statusBg, color: statusColor }}
              >
                <Award size={14} />
              </div>
              <span
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: "var(--color-text-muted)" }}
              >
                Status
              </span>
            </div>
            <p className="text-sm font-bold" style={{ color: statusColor }}>
              {statusLabel}
            </p>
          </div>

          {/* Kehadiran Kelas */}
          <div className="neu-card-white p-4">
            <div className="flex items-center gap-2 mb-3">
              <div
                className="p-1.5 rounded-lg"
                style={{
                  background: "var(--color-success-light)",
                  color: "var(--color-success)",
                }}
              >
                <CalendarCheck size={14} />
              </div>
              <span
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: "var(--color-text-muted)" }}
              >
                Kelas
              </span>
            </div>
            <p
              className="text-2xl font-bold"
              style={{ color: "var(--color-text)" }}
            >
              {kehadiranKelas}%
            </p>
            <p
              className="text-[10px] mt-0.5"
              style={{ color: "var(--color-text-subtle)" }}
            >
              {currentRiwayat.rekapAbsenKelas.hadir}/
              {currentRiwayat.rekapAbsenKelas.total} sesi
            </p>
          </div>

          {/* Kehadiran Sakan */}
          <div className="neu-card-white p-4">
            <div className="flex items-center gap-2 mb-3">
              <div
                className="p-1.5 rounded-lg"
                style={{
                  background: "var(--color-primary-50)",
                  color: "var(--color-primary)",
                }}
              >
                <CheckCircle size={14} />
              </div>
              <span
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: "var(--color-text-muted)" }}
              >
                Sakan
              </span>
            </div>
            <p
              className="text-2xl font-bold"
              style={{ color: "var(--color-text)" }}
            >
              {kehadiranSakan}%
            </p>
            <p
              className="text-[10px] mt-0.5"
              style={{ color: "var(--color-text-subtle)" }}
            >
              {currentRiwayat.rekapAbsenSakan.hadir}/
              {currentRiwayat.rekapAbsenSakan.total} hari
            </p>
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="space-y-2">
        <h3
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: "var(--color-text-muted)" }}
        >
          Menu Cepat
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            {
              href: "/santri/nilai",
              icon: FileText,
              label: "Lihat Nilai",
              desc: "Detail nilai per mata pelajaran",
            },
            {
              href: "/santri/absensi",
              icon: CalendarCheck,
              label: "Rekap Absensi",
              desc: "Kehadiran kelas, sakan & kegiatan",
            },
            {
              href: "/santri/riwayat",
              icon: Clock,
              label: "Riwayat Duf'ah",
              desc: "Histori per duf'ah sebelumnya",
            },
            {
              href: "/santri/perizinan",
              icon: Shield,
              label: "Riwayat Perizinan",
              desc: "Status izin dan tasrih",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="neu-card-white p-4 flex items-center gap-3 hover:scale-[1.01] transition-transform"
              >
                <div
                  className="flex-shrink-0 p-2 rounded-xl"
                  style={{
                    background: "var(--color-primary-50)",
                    color: "var(--color-primary)",
                  }}
                >
                  <Icon size={18} />
                </div>
                <div className="min-w-0">
                  <p
                    className="text-xs font-bold"
                    style={{ color: "var(--color-text)" }}
                  >
                    {item.label}
                  </p>
                  <p
                    className="text-[10px]"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {item.desc}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
