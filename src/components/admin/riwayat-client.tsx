"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, FileText, Printer, CheckCircle2, XCircle, Clock } from "lucide-react";

type StatusKelulusan = "LULUS" | "TIDAK_LULUS" | "MUSYAROKAH";

type AbsenSummary = { hadir: number; izin: number; sakit: number; alpha: number; total: number };
type AbsenHissoh = { hissoh: string; hadir: number; alpha: number; total: number };
type AbsenKegiatan = { nama: string; hadir: number; alpha: number; total: number };

type RiwayatRecord = {
  riwayatId: string;
  dufahNama: string;
  programNama: string;
  programId: string | null;
  kelasNama: string;
  kelasId: string | null;
  statusKelulusan: StatusKelulusan;
  isTasmi: boolean;
  canPrintSyahadah: boolean;
  canViewIjazah: boolean;
  nilaiList: Array<{ mapelNama: string; skor: number }>;
  rataRata: string | null;
  absenSakan?: AbsenSummary;
  absenKelasByHissoh?: AbsenHissoh[];
  absenKegiatan?: AbsenKegiatan[];
};

export type RiwayatSantriGroup = {
  santriId: string;
  nama: string;
  gender: string;
  lokasi: string;
  records: RiwayatRecord[];
};

function statusClass(status: string) {
  if (status === "LULUS") return "bg-emerald-100 text-emerald-700";
  if (status === "MUSYAROKAH") return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
}

function AbsenBadge({ hadir, total }: { hadir: number; total: number }) {
  if (total === 0) return <span className="text-xs text-slate-400 italic">Tidak ada data</span>;
  const pct = Math.round((hadir / total) * 100);
  const color = pct >= 75 ? "text-emerald-700 bg-emerald-50 border-emerald-200"
              : pct >= 50 ? "text-amber-700 bg-amber-50 border-amber-200"
              : "text-rose-700 bg-rose-50 border-rose-200";
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-bold ${color}`}>
      {hadir}/{total} ({pct}%)
    </span>
  );
}

function RiwayatRow({ santri, index }: { santri: RiwayatSantriGroup; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <tr className="align-top hover:bg-slate-50/80 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <td className="px-4 py-4 text-center">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
            {index + 1}
          </span>
        </td>
        <td className="px-6 py-4">
          <p className="font-bold text-slate-900">{santri.nama}</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">{santri.gender}</p>
        </td>
        <td className="px-6 py-4 text-slate-500">{santri.lokasi}</td>
        <td className="px-6 py-4">
          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
            {santri.records.length} Riwayat
          </span>
        </td>
        <td className="px-6 py-4 text-right">
          <button 
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            {isExpanded ? "Tutup Detail" : "Detail"}
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </td>
      </tr>
      
      {isExpanded && (
        <tr>
          <td colSpan={5} className="bg-slate-50/50 p-4 sm:p-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h4 className="mb-4 text-sm font-bold tracking-tight text-slate-900">Histori Tiap Duf&apos;ah</h4>
              <div className="space-y-4">
                {santri.records.map((record) => (
                  <div key={record.riwayatId} className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-4">
                    {/* Header Dufah */}
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-1.5">
                        <span className="inline-block rounded bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700">
                          {record.dufahNama}
                        </span>
                        <p className="text-sm font-semibold text-slate-800">
                          {record.programNama}{" "}
                          <span className="text-slate-400 font-normal ml-1">— {record.kelasNama}</span>
                        </p>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusClass(record.statusKelulusan)}`}>
                            {record.statusKelulusan}
                          </span>
                          {record.isTasmi && (
                            <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                              Tasmi&apos;
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 shrink-0">
                        {record.canViewIjazah ? (
                          <Link href={`/ijazah/${record.riwayatId}`} className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-700">
                            <FileText className="h-3.5 w-3.5" /> Ijazah Online
                          </Link>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500 cursor-not-allowed">
                            <FileText className="h-3.5 w-3.5" /> Ijazah Terkunci
                          </span>
                        )}
                        {record.canPrintSyahadah ? (
                          <Link href={`/cetak/${record.riwayatId}`} className="inline-flex items-center gap-1.5 rounded-full bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700">
                            <Printer className="h-3.5 w-3.5" /> Syahadah
                          </Link>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500 cursor-not-allowed">
                            <Printer className="h-3.5 w-3.5" /> Cetak Terkunci
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Nilai Mapel */}
                    <div>
                      <p className="mb-1.5 text-xs font-semibold text-slate-500">Nilai Mapel:</p>
                      <div className="flex flex-wrap gap-2">
                        {record.nilaiList.length === 0 ? (
                          <span className="text-xs italic text-slate-400">Belum ada nilai</span>
                        ) : (
                          record.nilaiList.map((n, idx) => (
                            <span key={idx} className="inline-flex rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600">
                              {n.mapelNama}: <strong className="ml-1">{n.skor}</strong>
                            </span>
                          ))
                        )}
                        {record.rataRata && (
                          <span className="inline-flex rounded border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700">
                            Rata-rata: {record.rataRata}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Rekap Absensi */}
                    <div className="border-t border-slate-200 pt-3">
                      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Rekap Absensi</p>
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                        {/* Sakan */}
                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                          <p className="text-xs font-bold text-slate-700 mb-2">🏠 Sakan</p>
                          {record.absenSakan?.total === 0 || !record.absenSakan ? (
                            <span className="text-xs text-slate-400 italic">Belum ada data</span>
                          ) : (
                            <div className="space-y-0.5">
                              <div className="flex justify-between text-xs"><span>Hadir</span><AbsenBadge hadir={record.absenSakan.hadir} total={record.absenSakan.total} /></div>
                              <div className="flex justify-between text-xs text-slate-500"><span>Izin</span><span className="font-bold">{record.absenSakan.izin}</span></div>
                              <div className="flex justify-between text-xs text-slate-500"><span>Sakit</span><span className="font-bold">{record.absenSakan.sakit}</span></div>
                              <div className="flex justify-between text-xs text-slate-500"><span>Alpha</span><span className="font-bold text-rose-600">{record.absenSakan.alpha}</span></div>
                            </div>
                          )}
                        </div>

                        {/* Kelas */}
                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                          <p className="text-xs font-bold text-slate-700 mb-2">📚 Kelas (per Hissoh)</p>
                          {!record.absenKelasByHissoh || record.absenKelasByHissoh.length === 0 ? (
                            <span className="text-xs text-slate-400 italic">Belum ada data</span>
                          ) : (
                            <div className="space-y-0.5">
                              {record.absenKelasByHissoh.map((h) => (
                                <div key={h.hissoh} className="flex justify-between text-xs">
                                  <span className="text-slate-600">{h.hissoh}</span>
                                  <AbsenBadge hadir={h.hadir} total={h.total} />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Kegiatan */}
                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                          <p className="text-xs font-bold text-slate-700 mb-2">⚡ Kegiatan</p>
                          {!record.absenKegiatan || record.absenKegiatan.length === 0 ? (
                            <span className="text-xs text-slate-400 italic">Belum ada data</span>
                          ) : (
                            <div className="space-y-0.5">
                              {record.absenKegiatan.map((k, i) => (
                                <div key={i} className="flex justify-between text-xs">
                                  <span className="text-slate-600 truncate mr-2">{k.nama}</span>
                                  <AbsenBadge hadir={k.hadir} total={k.total} />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function RiwayatClient({
  santriGroups,
}: {
  santriGroups: RiwayatSantriGroup[];
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredGroups = santriGroups.filter((santri) =>
    santri.nama.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Filters / Utility */}
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 md:flex-row md:items-end md:justify-between">
          <div className="w-full md:max-w-md">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Cari Santri
            </label>
            <input
              type="text"
              placeholder="Masukkan nama santri..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex shrink-0 gap-3 text-sm">
            <span className="rounded-2xl bg-slate-100 px-4 py-2 font-semibold text-slate-700">
              {filteredGroups.length} Santri
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
              <tr>
                <th className="px-4 py-4 text-center">#</th>
                <th className="px-6 py-4">Santri</th>
                <th className="px-6 py-4">Lokasi</th>
                <th className="px-6 py-4">Total Riwayat</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
              {filteredGroups.map((santri, index) => (
                <RiwayatRow key={santri.santriId} santri={santri} index={index} />
              ))}
              {filteredGroups.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    Tidak ada data riwayat santri yang cocok.
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
