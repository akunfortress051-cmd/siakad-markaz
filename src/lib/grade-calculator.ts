/**
 * grade-calculator.ts — Single Source of Truth
 * 
 * Semua perhitungan nilai di seluruh sistem HARUS menggunakan modul ini.
 * Jangan menduplikasi formula di file lain.
 * 
 * Flow Akbarnas:
 *   1. Per-usbu: Σ(score × bobot_usbu) / 100
 *   2. Mapel jumlah_tes=1: nilai langsung → nilaiAkhir
 *   3. Setelah 2 bulan: simple average semua data points per mapel
 *   4. Akumulatif syahadah: Σ(rata2 × bobot) / 100
 * 
 * Flow Non-Akbarnas:
 *   1. Per-mapel: U1×30% + U2×30% + N×40%
 *   2. Akumulatif: Σ(nilaiAkhir × bobot) / 100
 */

// ─── Per-Mapel NilaiAkhir ────────────────────────────────────────

/**
 * Hitung nilaiAkhir per-mapel dari skor U1, U2, Nihai.
 * - Akbarnas: rata-rata sederhana (U1+U2+N) / jumlah_data
 * - Non-Akbarnas: rata-rata berbobot U1×30% + U2×30% + N×40%
 */
export function calcMapelNilaiAkhir(
  scores: { u1: number | null; u2: number | null; n: number | null },
  isAkbarnas: boolean
): number | null {
  const { u1, u2, n } = scores;

  if (isAkbarnas) {
    // Simple average dari semua skor yang tersedia
    const activeValues = [u1, u2, n].filter((v): v is number => v !== null);
    if (activeValues.length === 0) return null;
    const sum = activeValues.reduce((acc, v) => acc + v, 0);
    return Number((sum / activeValues.length).toFixed(2));
  } else {
    // Weighted average: U1(30%) + U2(30%) + N(40%)
    if (u1 === null || u2 === null || n === null) return null;
    return Number((u1 * 0.3 + u2 * 0.3 + n * 0.4).toFixed(2));
  }
}

// ─── Per-Mapel NilaiAkhir (Usbuain) ──────────────────────────────

/**
 * Hitung nilaiAkhir untuk mode Usbuain 2 kolom.
 * Formula: U1×40% + U2×60%
 */
export function calcMapelNilaiAkhirUsbuain2(
  scores: { u1: number | null; u2: number | null }
): number | null {
  if (scores.u1 === null || scores.u2 === null) return null;
  return Number((scores.u1 * 0.4 + scores.u2 * 0.6).toFixed(2));
}

// ─── Nilai Tambahan ──────────────────────────────────────────────

/**
 * Terapkan nilai tambahan ke nilaiAkhir, cap di 100.
 */
export function applyNilaiTambahan(nilaiAkhir: number, tambahan: number): number {
  return Math.min(100, nilaiAkhir + Math.max(0, tambahan));
}

// ─── Akumulatif (Per-Usbu atau Syahadah) ─────────────────────────

export type AkumulatifItem = {
  score: number;
  bobot: number;
};

/**
 * Hitung nilai akumulatif berbobot.
 * Formula: Σ(score × bobot) / 100
 * 
 * Digunakan untuk:
 * - Akumulatif per-usbu  → score=nilaiUsbu, bobot=bobot_usbu
 * - Akumulatif syahadah   → score=nilaiAkhir(+tambahan), bobot=bobot
 */
export function calcAkumulatif(items: AkumulatifItem[]): number {
  if (items.length === 0) return 0;
  const totalSkorBobot = items.reduce((total, item) => total + (item.score * item.bobot), 0);
  return Number((totalSkorBobot / 100).toFixed(2));
}

// ─── Gabungan Akbarnas (2 Bulan) ─────────────────────────────────

export type NilaiRecord = {
  mapelId: string;
  nilaiUsbu1: number | null;
  nilaiUsbu2: number | null;
  nilaiNihai: number | null;
  nilaiAkhir: number | null;
  nilaiTambahan?: number;
};

/**
 * Hitung rata-rata gabungan 2 bulan untuk satu mapel Akbarnas.
 * Kumpulkan semua data points (U1, U2, Nihai, atau nilaiAkhir langsung)
 * dari semua riwayat, lalu simple average.
 * 
 * Jumlah data points per mapel bergantung pada jumlah_tes × jumlah bulan:
 *   - Kalam (jumlah_tes=3, 2 bulan): 6 data points
 *   - Qawaid (jumlah_tes=3 B1, jumlah_tes_b2=1 B2): 4 data points
 *   - MC (jumlah_tes=1): langsung nilaiAkhir
 */
export function calcAkbarnasMapelAverage(nilaiRecords: NilaiRecord[]): number | null {
  const allWeeklyScores: number[] = [];
  const directScores: number[] = [];

  for (const n of nilaiRecords) {
    if (n.nilaiUsbu1 !== null && n.nilaiUsbu1 !== undefined) allWeeklyScores.push(n.nilaiUsbu1);
    if (n.nilaiUsbu2 !== null && n.nilaiUsbu2 !== undefined) allWeeklyScores.push(n.nilaiUsbu2);
    if (n.nilaiNihai !== null && n.nilaiNihai !== undefined) allWeeklyScores.push(n.nilaiNihai);

    // Mapel jumlah_tes=1: nilaiAkhir langsung
    if (n.nilaiUsbu1 === null && n.nilaiUsbu2 === null && n.nilaiNihai === null &&
        n.nilaiAkhir !== null && n.nilaiAkhir !== undefined) {
      directScores.push(n.nilaiAkhir);
    }
  }

  const allScores = [...allWeeklyScores, ...directScores];
  if (allScores.length === 0) return null;

  const sum = allScores.reduce((a, b) => a + b, 0);
  return Number((sum / allScores.length).toFixed(2));
}

/**
 * Hitung rata-rata gabungan 2 bulan untuk SEMUA mapel Akbarnas.
 * Returns a Map<mapelId, nilaiAkhir>
 */
export function calcAkbarnasGabungan(
  allNilaiRecords: NilaiRecord[]
): Map<string, number | null> {
  // Group by mapelId
  const groups = new Map<string, NilaiRecord[]>();
  for (const n of allNilaiRecords) {
    if (!groups.has(n.mapelId)) groups.set(n.mapelId, []);
    groups.get(n.mapelId)!.push(n);
  }

  const result = new Map<string, number | null>();
  for (const [mapelId, records] of groups.entries()) {
    result.set(mapelId, calcAkbarnasMapelAverage(records));
  }
  return result;
}
