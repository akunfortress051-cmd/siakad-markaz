"use client";

import { useEffect, useState } from "react";
import { FileText, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";

type NilaiRow = {
  mapelId: string;
  namaIndo: string;
  namaArab: string;
  urutan: number;
  jumlahTes: number;
  nilaiUsbu1: number | null;
  nilaiUsbu2: number | null;
  nilaiNihai: number | null;
  nilaiAkhir: number | null;
  nilaiTambahan: number;
  skor: number | null;
  predikat: { indo: string; arab: string } | null;
  masukAkumulasi: boolean;
  bobot: number;
};

type RiwayatData = {
  id: string;
  dufahNama: string;
  programNama: string;
  kelasNama: string;
  usbuainMode: number;
  nilaiRows: NilaiRow[];
  average: number;
  averagePredikat: { indo: string; arab: string };
  statusKelulusan: string;
};

export default function SantriNilaiPage() {
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

  if (riwayat.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <FileText size={32} style={{ color: "var(--color-text-subtle)" }} />
        <p
          className="text-sm font-semibold"
          style={{ color: "var(--color-text-muted)" }}
        >
          Belum ada data nilai
        </p>
      </div>
    );
  }

  const current = riwayat[activeDufah];
  if (!current) return null;

  const getScoreColor = (skor: number | null, kkm: number = 70) => {
    if (skor === null) return "var(--color-text-subtle)";
    if (skor >= 85) return "var(--color-success)";
    if (skor >= kkm) return "var(--color-primary)";
    return "var(--color-danger)";
  };

  const usbuLabel = (mode: number) => {
    if (mode === 1) return ["Nihai"];
    if (mode === 2) return ["Usbu 1", "Usbu 2"];
    return ["Usbu 1", "Usbu 2", "Nihai"];
  };

  const columns = usbuLabel(current.usbuainMode);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-xl font-bold"
          style={{ color: "var(--color-text)" }}
        >
          Nilai Akademik
        </h1>
        <p
          className="text-xs mt-0.5"
          style={{ color: "var(--color-text-muted)" }}
        >
          Detail nilai per mata pelajaran
        </p>
      </div>

      {/* Dufah Selector */}
      {riwayat.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {riwayat.map((r, i) => (
            <button
              key={r.id}
              onClick={() => setActiveDufah(i)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                i === activeDufah ? "" : "neu-button"
              }`}
              style={
                i === activeDufah
                  ? {
                      background: "var(--color-primary)",
                      color: "#fff",
                      boxShadow:
                        "3px 3px 8px rgba(0,102,102,0.3), -2px -2px 6px rgba(0,133,133,0.15)",
                    }
                  : { color: "var(--color-text-muted)" }
              }
            >
              {r.dufahNama}
            </button>
          ))}
        </div>
      )}

      {/* Info Bar */}
      <div
        className="rounded-xl p-3.5 flex flex-wrap items-center gap-x-6 gap-y-2"
        style={{
          background: "var(--color-primary-50)",
          boxShadow: "var(--shadow-inset-sm)",
        }}
      >
        <div>
          <span
            className="text-[10px] font-bold uppercase tracking-wider block"
            style={{ color: "var(--color-text-muted)" }}
          >
            Program
          </span>
          <span
            className="text-xs font-bold"
            style={{ color: "var(--color-text)" }}
          >
            {current.programNama}
          </span>
        </div>
        <div>
          <span
            className="text-[10px] font-bold uppercase tracking-wider block"
            style={{ color: "var(--color-text-muted)" }}
          >
            Kelas
          </span>
          <span
            className="text-xs font-bold"
            style={{ color: "var(--color-text)" }}
          >
            {current.kelasNama}
          </span>
        </div>
        <div>
          <span
            className="text-[10px] font-bold uppercase tracking-wider block"
            style={{ color: "var(--color-text-muted)" }}
          >
            Duf&apos;ah
          </span>
          <span
            className="text-xs font-bold"
            style={{ color: "var(--color-text)" }}
          >
            {current.dufahNama}
          </span>
        </div>
      </div>

      {/* Nilai Table */}
      <div className="neu-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr
                style={{
                  background: "var(--color-primary)",
                  color: "#fff",
                }}
              >
                <th className="text-left py-3 px-4 font-bold">
                  No
                </th>
                <th className="text-left py-3 px-4 font-bold">
                  Mata Pelajaran
                </th>
                {columns.map((col) => (
                  <th
                    key={col}
                    className="text-center py-3 px-3 font-bold"
                  >
                    {col}
                  </th>
                ))}
                <th className="text-center py-3 px-3 font-bold">
                  N. Akhir
                </th>
                <th className="text-center py-3 px-3 font-bold">
                  Predikat
                </th>
              </tr>
            </thead>
            <tbody>
              {current.nilaiRows.map((row, idx) => (
                <tr
                  key={row.mapelId}
                  style={{
                    background:
                      idx % 2 === 0 ? "var(--bg-card)" : "var(--color-surface-light)",
                    borderBottom: "1px solid var(--color-surface-dark)",
                  }}
                >
                  <td
                    className="py-3 px-4 font-semibold"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {idx + 1}
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <span
                        className="font-bold block"
                        style={{ color: "var(--color-text)" }}
                      >
                        {row.namaIndo}
                      </span>
                      <span
                        className="text-[10px] font-medium"
                        style={{
                          color: "var(--color-text-subtle)",
                          fontFamily: "'Amiri', serif",
                          direction: "rtl",
                        }}
                      >
                        {row.namaArab}
                      </span>
                    </div>
                  </td>
                  {current.usbuainMode !== 1 && (
                    <td className="text-center py-3 px-3 font-bold" style={{ color: getScoreColor(row.nilaiUsbu1) }}>
                      {row.nilaiUsbu1 !== null
                        ? Math.round(row.nilaiUsbu1)
                        : "-"}
                    </td>
                  )}
                  {current.usbuainMode !== 1 && current.usbuainMode !== 0 ? null : current.usbuainMode === 0 ? (
                    <td className="text-center py-3 px-3 font-bold" style={{ color: getScoreColor(row.nilaiUsbu2) }}>
                      {row.nilaiUsbu2 !== null
                        ? Math.round(row.nilaiUsbu2)
                        : "-"}
                    </td>
                  ) : null}
                  {current.usbuainMode === 2 && (
                    <td className="text-center py-3 px-3 font-bold" style={{ color: getScoreColor(row.nilaiUsbu2) }}>
                      {row.nilaiUsbu2 !== null
                        ? Math.round(row.nilaiUsbu2)
                        : "-"}
                    </td>
                  )}
                  {(current.usbuainMode === 0 || current.usbuainMode === 1) && (
                    <td className="text-center py-3 px-3 font-bold" style={{ color: getScoreColor(row.nilaiNihai) }}>
                      {row.nilaiNihai !== null
                        ? Math.round(row.nilaiNihai)
                        : "-"}
                    </td>
                  )}
                  <td
                    className="text-center py-3 px-3 font-bold text-sm"
                    style={{ color: getScoreColor(row.skor) }}
                  >
                    {row.skor !== null ? Math.round(row.skor) : "-"}
                  </td>
                  <td className="text-center py-3 px-3">
                    {row.predikat ? (
                      <span
                        className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold"
                        style={{
                          background:
                            row.skor !== null && row.skor >= 85
                              ? "var(--color-success-light)"
                              : row.skor !== null && row.skor >= 70
                                ? "var(--color-primary-50)"
                                : "var(--color-danger-light)",
                          color: getScoreColor(row.skor),
                        }}
                      >
                        {row.predikat.indo}
                      </span>
                    ) : (
                      <span style={{ color: "var(--color-text-subtle)" }}>
                        -
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Footer */}
        <div
          className="p-4 flex items-center justify-between"
          style={{
            background: "var(--color-primary-50)",
            borderTop: "2px solid var(--color-primary-100)",
          }}
        >
          <div>
            <span
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: "var(--color-text-muted)" }}
            >
              Rata-rata Akumulatif
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="text-lg font-bold"
              style={{ color: "var(--color-primary)" }}
            >
              {current.average || "-"}
            </span>
            {current.averagePredikat && (
              <span
                className="px-3 py-1 rounded-full text-[10px] font-bold"
                style={{
                  background: "var(--color-primary)",
                  color: "#fff",
                }}
              >
                {current.averagePredikat.indo}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Status */}
      <div
        className="neu-card p-4 flex items-center justify-between"
      >
        <span
          className="text-xs font-bold"
          style={{ color: "var(--color-text-muted)" }}
        >
          Status Kelulusan
        </span>
        <span
          className="px-3 py-1.5 rounded-full text-xs font-bold"
          style={{
            background:
              current.statusKelulusan === "LULUS"
                ? "var(--color-success-light)"
                : current.statusKelulusan === "TIDAK_LULUS"
                  ? "var(--color-danger-light)"
                  : "var(--color-warning-light)",
            color:
              current.statusKelulusan === "LULUS"
                ? "var(--color-success)"
                : current.statusKelulusan === "TIDAK_LULUS"
                  ? "var(--color-danger)"
                  : "var(--color-warning)",
          }}
        >
          {current.statusKelulusan === "LULUS"
            ? "Lulus"
            : current.statusKelulusan === "TIDAK_LULUS"
              ? "Tidak Lulus"
              : "Belum Lengkap"}
        </span>
      </div>
    </div>
  );
}
