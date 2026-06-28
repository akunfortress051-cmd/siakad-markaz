"use client";

import React, { Fragment } from "react";

type MapelOption = {
  id: string;
  nama_indo: string;
  bobot?: number;
};

type NilaiData = {
  u1: number | null;
  u2: number | null;
  n: number | null;
  a: number | null;
  tambahan: number;
};

type SantriRow = {
  riwayatId: string;
  santriId: string;
  nama: string;
  is_tasmi: boolean;
  jumlah_kolom_usbu: number;
  nilai: Record<string, NilaiData>;
};

type SummaryResult = {
  mapelSummaries: { mapelId: string; nilaiAkhir: number; tambahan: number; final: number; belowKkm: boolean }[];
  rataRata: number;
  hasMusyarokah: boolean;
};

type ChangesRow = {
  is_tasmi?: boolean;
  nilai?: Record<string, Partial<NilaiData>>;
};

export function GabunganTable({
  mapels, santriList, isLoading, kkm, changes,
  computeSummary, handleNilaiChange,
}: {
  mapels: MapelOption[];
  santriList: SantriRow[];
  isLoading: boolean;
  kkm: number;
  changes: Record<string, ChangesRow>;
  computeSummary: (row: SantriRow) => SummaryResult;
  handleNilaiChange: (riwayatId: string, mapelId: string, field: any, value: number | null) => void;
}) {
  return (
    <table className="w-full text-left text-sm border-collapse min-w-max">
      <thead className="bg-[var(--color-secondary)] text-xs uppercase tracking-[0.1em] text-[var(--color-text-muted)] sticky top-0 z-30">
        <tr>
          <th className="px-3 py-3 text-center border-b border-[var(--color-surface-dark)] sticky left-0 bg-[var(--color-secondary)] z-20 border-r w-[40px]" rowSpan={2}>No</th>
          <th className="px-3 py-3 border-b border-[var(--color-surface-dark)] sticky left-[40px] bg-[var(--color-secondary)] z-20 border-r min-w-[120px] max-w-[120px] md:min-w-[200px] md:max-w-none" rowSpan={2}>Nama</th>
          {mapels.map(m => (
            <th key={m.id} className="px-2 py-2 text-center border-b border-r border-[var(--color-surface-dark)] bg-[var(--color-surface)] min-w-[110px]" colSpan={2}>
              <div className="text-[10px] font-bold">{m.nama_indo}</div>
              <div className="text-[9px] text-[var(--color-text-subtle)]">Bobot: {m.bobot ?? 0}%</div>
            </th>
          ))}
          <th className="px-3 py-3 text-center border-b border-[var(--color-surface-dark)] bg-emerald-50 min-w-[70px] font-bold" rowSpan={2}>Rata²</th>
          <th className="px-3 py-3 text-center border-b border-[var(--color-surface-dark)] bg-emerald-50 min-w-[100px] font-bold" rowSpan={2}>Status</th>
        </tr>
        <tr>
          {mapels.map(m => (
            <Fragment key={`sub_${m.id}`}>
              <th className="px-1 py-2 text-center border-b border-[var(--color-surface-dark)] bg-[var(--color-secondary)] text-[9px] w-[55px]">Nilai</th>
              <th className="px-1 py-2 text-center border-b border-r border-[var(--color-surface-dark)] bg-amber-50 text-[9px] w-[55px] text-amber-700 font-bold">+Tambah</th>
            </Fragment>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-[var(--color-surface)]">
        {isLoading ? (
          <tr><td colSpan={2 + mapels.length * 2 + 2} className="text-center py-12 text-[var(--color-text-muted)]">Memuat data gabungan...</td></tr>
        ) : santriList.length === 0 ? (
          <tr><td colSpan={2 + mapels.length * 2 + 2} className="text-center py-12 text-[var(--color-text-muted)]">Tidak ada data.</td></tr>
        ) : santriList.map((row, index) => {
          const summary = computeSummary(row);
          const hasChange = !!changes[row.riwayatId];
          return (
            <tr key={row.riwayatId} className={`transition hover:bg-[var(--color-secondary)]/80 ${hasChange ? 'bg-amber-50/30' : ''}`}>
              <td className="px-3 py-2 text-center font-medium sticky left-0 bg-white z-10 border-r text-[var(--color-text-subtle)]">{index + 1}</td>
              <td className="px-3 py-2 font-bold text-[var(--color-text)] sticky left-[40px] bg-white z-10 border-r min-w-[120px] max-w-[120px] md:min-w-[200px] md:max-w-none text-[10px] md:text-xs whitespace-normal break-words leading-snug">{row.nama}</td>
              {mapels.map(m => {
                const s = summary.mapelSummaries.find(x => x.mapelId === m.id);
                const nilaiAkhir = s?.nilaiAkhir ?? 0;
                const currentTambahan = changes[row.riwayatId]?.nilai?.[m.id]?.tambahan !== undefined
                  ? (changes[row.riwayatId].nilai![m.id].tambahan as number) : (row.nilai?.[m.id]?.tambahan ?? 0);
                const finalScore = nilaiAkhir + currentTambahan;
                const isBelowKkm = finalScore < kkm && nilaiAkhir > 0;
                const canPaskanKkm = nilaiAkhir > 0 && nilaiAkhir < kkm && (kkm - nilaiAkhir) <= 5;
                return (
                  <Fragment key={`g_${m.id}`}>
                    <td className={`px-1 py-2 text-center font-bold text-sm ${isBelowKkm ? 'text-red-600 bg-red-50' : 'text-[var(--color-text)]'}`}>
                      {nilaiAkhir > 0 ? Math.round(nilaiAkhir) : "-"}
                    </td>
                    <td className="px-1 py-2 text-center border-r border-[var(--color-surface-dark)]">
                      {nilaiAkhir > 0 ? (
                        <input type="number" min={0} max={Math.max(0, 100 - Math.round(nilaiAkhir))}
                          value={currentTambahan || ""}
                          placeholder="+"
                          onChange={(e) => handleNilaiChange(row.riwayatId, m.id, "tambahan", e.target.value === "" ? 0 : Math.min(Math.max(0, 100 - Math.round(nilaiAkhir)), Math.max(0, Number(e.target.value))))}
                          onWheel={(e) => e.currentTarget.blur()}
                          className="w-10 rounded border border-amber-300 bg-amber-50 px-1 py-1 text-center text-xs font-bold text-amber-800 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      ) : (
                        <span className="text-[10px] text-gray-300">-</span>
                      )}
                    </td>
                  </Fragment>
                );
              })}
              <td className="px-3 py-2 text-center font-extrabold bg-emerald-50/50 text-[var(--color-text)]">
                {summary.rataRata > 0 ? Math.round(summary.rataRata) : "-"}
              </td>
              <td className="px-3 py-2 text-center bg-emerald-50/50">
                {summary.hasMusyarokah ? (
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">MUSYAROKAH</span>
                ) : summary.rataRata > 0 ? (
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">LULUS</span>
                ) : (
                  <span className="text-[10px] text-gray-400">-</span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
