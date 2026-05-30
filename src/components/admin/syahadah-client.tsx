"use client";

import { useState } from "react";
import Link from "next/link";

type StatusKelulusan = "LULUS" | "TIDAK_LULUS" | "MUSYAROKAH";

type DashboardSantri = {
  id: string;
  nama: string;
  gender: string;
  lokasi: string;
  programNama: string;
  programId: string | null;
  kelasNama: string;
  kelasId: string | null;
  statusKelulusan: StatusKelulusan;
  isTasmi: boolean;
  canPrintSyahadah: boolean;
  canViewIjazah: boolean;
  isAktif: boolean;
};

type ProgramItem = {
  id: string;
  nama_indo: string;
  kelasList: Array<{
    id: string;
    nama: string;
  }>;
};

function statusClass(status: string) {
  if (status === "LULUS") return "bg-emerald-100 text-emerald-700";
  if (status === "MUSYAROKAH") return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
}

export function SyahadahClient({
  santriRows,
  programList,
}: {
  santriRows: DashboardSantri[];
  programList: ProgramItem[];
}) {
  const [filterKelasId, setFilterKelasId] = useState<string>("ALL");

  const allOptions = [
    { id: "ALL", label: "Semua Santri", group: "" },
    ...programList.flatMap((program) =>
      program.kelasList.length > 0
        ? program.kelasList.map((k) => ({ id: k.id, label: k.nama, group: program.nama_indo }))
        : [{ id: `PROGRAM_${program.id}`, label: program.nama_indo, group: "Program" }]
    ),
    { id: "UNASSIGNED", label: "Belum Ditempatkan", group: "" },
  ];

  const filteredSantri = santriRows.filter((santri) => {
    if (filterKelasId === "ALL") return true;
    if (filterKelasId === "UNASSIGNED") return santri.programId === null;
    if (filterKelasId.startsWith("PROGRAM_")) {
      const programId = filterKelasId.replace("PROGRAM_", "");
      return santri.programId === programId;
    }
    return santri.kelasId === filterKelasId;
  });

  const totalTasmi = filteredSantri.filter((santri) => santri.isTasmi).length;
  const totalSiapCetak = filteredSantri.filter((santri) => santri.canPrintSyahadah).length;
  const selectedLabel = allOptions.find((o) => o.id === filterKelasId)?.label ?? "Semua Santri";
  const selectedCount = filteredSantri.length;

  return (
    <div className="space-y-6">
      {/* Filter + Summary Row */}
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-4">
            {/* Dropdown Filter */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Filter Kelas / Ruangan
              </label>
              <select
                value={filterKelasId}
                onChange={(e) => setFilterKelasId(e.target.value)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white"
              >
                {allOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.group ? `${opt.group} — ${opt.label}` : opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Summary Stats */}
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="rounded-2xl bg-slate-100 px-3 py-1.5 font-semibold text-slate-700">
                {selectedCount} santri
              </span>
              <span className="rounded-2xl bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-700">
                {totalTasmi} Tasmi&apos;
              </span>
              <span className="rounded-2xl bg-amber-50 px-3 py-1.5 font-semibold text-amber-700">
                {totalSiapCetak} Siap Cetak
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/input-nilai-kelas"
              className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 shadow-sm"
            >
              Input Nilai Masal
            </Link>
            <Link
              href="/admin/manajemen-kelas"
              className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-white hover:text-emerald-700"
            >
              Atur Penempatan Kelas
            </Link>
            <Link
              href="/admin/master-data"
              className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-white hover:text-emerald-700"
            >
              Atur KKM &amp; Template
            </Link>
            <Link
              href="/layout-editor"
              className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
            >
              🎨 Atur Layout Syahadah
            </Link>
            {filterKelasId !== "ALL" && filterKelasId !== "UNASSIGNED" && !filterKelasId.startsWith("PROGRAM_") && (
              <a
                href={`/cetak-bulk/${filterKelasId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 shadow-sm"
              >
                Cetak Syahadah (Ruangan)
              </a>
            )}
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
                <th className="px-6 py-4">Kelas</th>
                <th className="px-6 py-4">Tasmi&apos;</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
              {filteredSantri.map((santri, index) => (
                <tr key={santri.id} className="align-top hover:bg-slate-50/80">
                  {/* No urut */}
                  <td className="px-4 py-4 text-center">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                      {index + 1}
                    </span>
                  </td>
                  {/* Nama */}
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900">{santri.nama}</p>
                    <p className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">{santri.gender}</p>
                  </td>
                  {/* Lokasi */}
                  <td className="px-6 py-4 text-slate-500">{santri.lokasi}</td>
                  {/* Kelas */}
                  <td className="px-6 py-4">
                    {santri.kelasId ? (
                      <div>
                        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                          {santri.kelasNama}
                        </span>
                        {santri.programId && (
                          <p className="mt-1 text-xs text-slate-400">{santri.programNama}</p>
                        )}
                      </div>
                    ) : santri.programId !== null ? (
                      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                        {santri.programNama}
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-600">
                        Tanpa Kelas
                      </span>
                    )}
                  </td>
                  {/* Tasmi */}
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${santri.isTasmi ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                      {santri.isTasmi ? "Sudah" : "Belum"}
                    </span>
                  </td>
                  {/* Status */}
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusClass(santri.statusKelulusan)}`}>
                      {santri.statusKelulusan}
                    </span>
                  </td>
                  {/* Aksi */}
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link
                        href={`/admin/input-nilai/${santri.id}`}
                        className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        Input Nilai
                      </Link>
                      {santri.canViewIjazah ? (
                        <>
                          <Link
                            href={`/admin/syahadah/${santri.id}/transkrip`}
                            className="rounded-full bg-blue-100 px-4 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-200"
                          >
                            Transkrip Detail
                          </Link>
                          <Link
                            href={`/ijazah/${santri.id}`}
                            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-700"
                          >
                            Ijazah Online
                          </Link>
                        </>
                      ) : (
                        <span className="rounded-full bg-slate-200 px-4 py-2 text-xs font-bold text-slate-500">
                          Ijazah Terkunci
                        </span>
                      )}
                      {santri.canPrintSyahadah ? (
                        <Link
                          href={`/cetak/${santri.id}`}
                          className="rounded-full bg-amber-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-amber-700"
                        >
                          Cetak Syahadah
                        </Link>
                      ) : (
                        <span className="rounded-full bg-slate-200 px-4 py-2 text-xs font-bold text-slate-500">
                          Cetak Terkunci
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSantri.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    Tidak ada santri di kelas ini.
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
