"use client";

import { useState } from "react";
import Link from "next/link";

type StatusKelulusan = "LULUS" | "TIDAK_LULUS" | "MUSYAROKAH";

type DashboardSantri = {
  id: string;
  nama: string;
  gender: string;
  lokasi: string;
  kelasNama: string;
  statusKelulusan: StatusKelulusan;
  isTasmi: boolean;
  isSetoranLulus: boolean;
  canPrintSyahadah: boolean;
  canViewIjazah: boolean;
  isAktif: boolean;
};

type KelasItem = {
  id: string;
  nama_indo: string;
};

function statusClass(status: string) {
  if (status === "LULUS") return "bg-emerald-100 text-emerald-700";
  if (status === "MUSYAROKAH") return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
}

function booleanBadge(value: boolean, positiveLabel: string, negativeLabel: string) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
        value ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
      }`}
    >
      {value ? positiveLabel : negativeLabel}
    </span>
  );
}

export function DashboardClient({
  santriRows,
  kelasList,
}: {
  santriRows: DashboardSantri[];
  kelasList: KelasItem[];
}) {
  const [filterKelasId, setFilterKelasId] = useState<string>("ALL");

  const filteredSantri = santriRows.filter((santri) => {
    if (filterKelasId === "ALL") return true;
    if (filterKelasId === "UNASSIGNED") return santri.kelasNama === "-";
    // We only have kelasNama in santriRows, but kelasList gives us ID and nama_indo.
    // So we match by nama_indo.
    const selectedKelas = kelasList.find((k) => k.id === filterKelasId);
    if (!selectedKelas) return true;
    return santri.kelasNama === selectedKelas.nama_indo;
  });

  const totalTasmi = filteredSantri.filter((santri) => santri.isTasmi).length;
  const totalSiapCetak = filteredSantri.filter((santri) => santri.canPrintSyahadah).length;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[{ id: "ALL", nama_indo: "Semua Santri" }, ...kelasList, { id: "UNASSIGNED", nama_indo: "Belum Ditempatkan" }].map((kelas) => {
          const count = kelas.id === "ALL" 
             ? santriRows.length 
             : kelas.id === "UNASSIGNED" 
                 ? santriRows.filter((s) => s.kelasNama === "-").length
                 : santriRows.filter((s) => s.kelasNama === kelas.nama_indo).length;
          
          const isActive = filterKelasId === kelas.id;
          
          return (
            <button
              key={kelas.id}
              onClick={() => setFilterKelasId(kelas.id)}
              className={`rounded-[1.75rem] border p-5 shadow-sm text-left transition ${
                isActive 
                  ? "border-emerald-500 bg-emerald-50 shadow-emerald-100" 
                  : "border-slate-200 bg-white hover:border-emerald-300"
              }`}
            >
              <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${isActive ? "text-emerald-700" : "text-slate-500"}`}>
                {kelas.nama_indo}
              </p>
              <p className={`mt-3 text-4xl font-black ${isActive ? "text-emerald-700" : "text-slate-900"}`}>
                {count}
              </p>
            </button>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-700">Filter Aktif: {kelasList.find(k => k.id === filterKelasId)?.nama_indo || (filterKelasId === "UNASSIGNED" ? "Belum Ditempatkan" : "Semua Santri")}</p>
            <h3 className="mt-1 text-2xl font-bold text-slate-900">
              Total {filteredSantri.length} santri, {totalTasmi} sudah Tasmi', {totalSiapCetak} Siap Cetak
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
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
              Atur KKM & Template
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
              <tr>
                <th className="px-6 py-4">Santri</th>
                <th className="px-6 py-4">Lokasi</th>
                <th className="px-6 py-4">Kelas</th>
                <th className="px-6 py-4">Tasmi&apos;</th>
                <th className="px-6 py-4">Setoran</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
              {filteredSantri.map((santri) => (
                <tr key={santri.id} className="align-top hover:bg-slate-50/80">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900">{santri.nama}</p>
                    <p className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">{santri.gender}</p>
                  </td>
                  <td className="px-6 py-4">{santri.lokasi}</td>
                  <td className="px-6 py-4">
                    {santri.kelasNama !== "-" ? (
                      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 font-bold text-slate-700">
                        {santri.kelasNama}
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-rose-50 px-3 py-1 font-bold text-rose-600">
                        Tanpa Kelas
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">{booleanBadge(santri.isTasmi, "Sudah", "Belum")}</td>
                  <td className="px-6 py-4">{booleanBadge(santri.isSetoranLulus, "Lulus", "Belum")}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusClass(santri.statusKelulusan)}`}>
                      {santri.statusKelulusan}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap justify-end gap-2">
                       <Link
                        href={`/admin/input-nilai/${santri.id}`}
                        className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        Input Nilai
                      </Link>
                      {santri.canViewIjazah ? (
                        <Link
                          href={`/ijazah/${santri.id}`}
                          className="rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-700"
                        >
                          Ijazah Online
                        </Link>
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
                          Cetak Syahadah Terkunci
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
