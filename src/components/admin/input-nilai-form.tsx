"use client";

import { calculateStatus } from "@/lib/kelulusan";
import { getPredikat } from "@/lib/formatters";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type MapelOption = {
  id: string;
  nama_indo: string;
  nama_arab: string;
  urutan: number;
};

type KelasOption = {
  id: string;
  nama_indo: string;
  nama_arab: string;
  kkm: number;
  mapelList: MapelOption[];
};

type MasterSantri = {
  id: string;
  nama: string;
  gender: string;
  sakan: string;
  kamar: string;
  nomorLemari: string;
  dufahNama: string;
};

type InternalSantri = {
  kelasId: string | null;
  tempat_lahir: string;
  tanggal_lahir: string;
  alamat: string;
  is_tasmi: boolean;
  is_setoran_lulus: boolean;
  status_kelulusan: string;
  nilaiList: Array<{
    mapelId: string;
    skor: number;
  }>;
} | null;

function statusBadgeClass(status: string) {
  if (status === "LULUS") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "MUSYAROKAH") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-rose-100 text-rose-700";
}

export function InputNilaiForm({
  santri,
  kelasList,
  internalSantri,
}: {
  santri: MasterSantri;
  kelasList: KelasOption[];
  internalSantri: InternalSantri;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [selectedKelasId, setSelectedKelasId] = useState(
    internalSantri?.kelasId ?? kelasList[0]?.id ?? "",
  );
  const [tempatLahir, setTempatLahir] = useState(internalSantri?.tempat_lahir ?? "");
  const [tanggalLahir, setTanggalLahir] = useState(internalSantri?.tanggal_lahir ?? "");
  const [alamat, setAlamat] = useState(internalSantri?.alamat ?? "");
  const [isTasmi, setIsTasmi] = useState(internalSantri?.is_tasmi ?? false);
  const [isSetoranLulus, setIsSetoranLulus] = useState(
    internalSantri?.is_setoran_lulus ?? false,
  );
  const [nilaiByMapel, setNilaiByMapel] = useState<Record<string, string>>(() => {
    return Object.fromEntries(
      (internalSantri?.nilaiList ?? []).map((nilai) => [nilai.mapelId, String(nilai.skor)]),
    );
  });

  const selectedKelas = kelasList.find((kelas) => kelas.id === selectedKelasId) ?? null;
  const activeMapelList = selectedKelas?.mapelList ?? [];
  const hasIncompleteNilai =
    !selectedKelas ||
    activeMapelList.some((mapel) => {
      const value = nilaiByMapel[mapel.id] ?? "";
      return value.trim() === "";
    });

  const numericNilai = activeMapelList
    .map((mapel) => ({
      mapelId: mapel.id,
      skor: Number(nilaiByMapel[mapel.id]),
    }))
    .filter((nilai) => Number.isFinite(nilai.skor));

  const average =
    numericNilai.length > 0
      ? numericNilai.reduce((total, nilai) => total + nilai.skor, 0) / numericNilai.length
      : 0;
  const averagePredikat = getPredikat(average);
  const previewStatus = !selectedKelas
    ? "TIDAK_LULUS"
    : !isTasmi || !isSetoranLulus
      ? "TIDAK_LULUS"
      : hasIncompleteNilai
        ? "MUSYAROKAH"
        : calculateStatus(
            {
              is_tasmi: isTasmi,
              is_setoran_lulus: isSetoranLulus,
            },
            numericNilai,
            selectedKelas,
          );

  const handleSubmit = () => {
    setError("");

    if (!selectedKelas) {
      setError("Pilih kelas terlebih dahulu.");
      return;
    }

    if (hasIncompleteNilai) {
      setError("Semua nilai mapel wajib diisi.");
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/admin/santri/${santri.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          kelasId: selectedKelas.id,
          tempat_lahir: tempatLahir,
          tanggal_lahir: tanggalLahir,
          alamat: alamat,
          is_tasmi: isTasmi,
          is_setoran_lulus: isSetoranLulus,
          nilaiList: activeMapelList.map((mapel) => ({
            mapelId: mapel.id,
            skor: Number(nilaiByMapel[mapel.id]),
          })),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? "Gagal menyimpan data nilai.");
        return;
      }

      router.push("/admin/dashboard");
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-700">
              Master Santri
            </p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">{santri.nama}</h2>
          </div>
          <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-2">
            <div className="rounded-3xl bg-slate-50 px-4 py-3">
              <p className="font-semibold text-slate-800">Gender</p>
              <p>{santri.gender}</p>
            </div>
            <div className="rounded-3xl bg-slate-50 px-4 py-3">
              <p className="font-semibold text-slate-800">Duf&apos;ah</p>
              <p>{santri.dufahNama}</p>
            </div>
            <div className="rounded-3xl bg-slate-50 px-4 py-3 md:col-span-2">
              <p className="font-semibold text-slate-800">Lokasi</p>
              <p>
                {santri.sakan} / {santri.kamar} / {santri.nomorLemari}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-[1.75rem] bg-slate-900 p-5 text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-300">
            Preview Kelulusan
          </p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className={`rounded-full px-4 py-2 text-sm font-bold ${statusBadgeClass(previewStatus)}`}>
              {previewStatus}
            </span>
            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Rata-rata</p>
              <p className="text-3xl font-black">{average.toFixed(1)}</p>
            </div>
          </div>
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
            <p className="font-semibold text-white">Predikat rata-rata</p>
            <p className="mt-1 text-slate-300">{averagePredikat.indo}</p>
          </div>
          <p className="mt-4 text-xs leading-6 text-slate-400">
            Syahadah hanya aktif saat Tasmi&apos; dan Setoran lulus. Jika ada nilai di bawah KKM, status otomatis menjadi MUSYAROKAH.
          </p>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-700">Data Diri</p>
          <h3 className="mt-2 text-xl font-bold text-slate-900">Domisili dan Kelahiran</h3>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <label className="space-y-2 text-sm font-semibold text-slate-700">
            <span>Tempat Lahir</span>
            <input
              type="text"
              value={tempatLahir}
              onChange={(e) => setTempatLahir(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white"
            />
          </label>
          <label className="space-y-2 text-sm font-semibold text-slate-700">
            <span>Tanggal Lahir (misal: 17 Agustus 2000)</span>
            <input
              type="text"
              value={tanggalLahir}
              onChange={(e) => setTanggalLahir(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white"
            />
          </label>
          <label className="space-y-2 text-sm font-semibold text-slate-700 md:col-span-2">
            <span>Alamat Lengkap</span>
            <input
              type="text"
              value={alamat}
              onChange={(e) => setAlamat(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white"
            />
          </label>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-6 md:grid-cols-2">
          <label className="space-y-2 text-sm font-semibold text-slate-700">
            <span>Pilih Kelas</span>
            <select
              value={selectedKelasId}
              onChange={(e) => setSelectedKelasId(e.target.value)}
              disabled={!!internalSantri?.kelasId}
              className={`w-full rounded-2xl border bg-slate-50 px-4 py-3 text-base font-bold outline-none transition ${
                !!internalSantri?.kelasId
                  ? "border-slate-200 text-slate-500 cursor-not-allowed opacity-80"
                  : "border-slate-200 text-slate-900 focus:border-emerald-500 focus:bg-white"
              }`}
            >
              {kelasList.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama_indo} (KKM: {k.kkm})
                </option>
              ))}
            </select>
            {!!internalSantri?.kelasId && (
              <p className="mt-1 text-xs text-amber-600 font-normal">
                * Kelas sudah ditetapkan dari Manajemen Kelas. Anda tidak bisa mengubahnya di sini.
              </p>
            )}
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={isSetoranLulus}
                onChange={(event) => setIsSetoranLulus(event.target.checked)}
                className="h-5 w-5 rounded border-slate-300 text-emerald-600"
              />
              Sudah Setoran Mufrodat/Takbirot
            </label>
            <label className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={isTasmi}
                onChange={(event) => setIsTasmi(event.target.checked)}
                className="h-5 w-5 rounded border-slate-300 text-emerald-600"
              />
              Sudah Tasmi&apos;
            </label>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-700">
              Input Nilai
            </p>
            <h3 className="mt-2 text-2xl font-bold text-slate-900">
              {selectedKelas ? `${selectedKelas.nama_indo} - KKM ${selectedKelas.kkm}` : "Pilih kelas untuk menampilkan mapel"}
            </h3>
          </div>
          <p className="text-sm text-slate-500">Skor wajib berupa angka 0-100.</p>
        </div>

        {selectedKelas ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activeMapelList.map((mapel) => {
              const currentValue = nilaiByMapel[mapel.id] ?? "";
              const numericValue = Number(currentValue);
              const predikat = Number.isFinite(numericValue) ? getPredikat(numericValue).indo : "-";

              return (
                <label
                  key={mapel.id}
                  className="rounded-[1.75rem] border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-emerald-200 hover:bg-white"
                >
                  <span className="block text-sm font-bold text-slate-900">{mapel.nama_indo}</span>
                  <span className="mt-1 block text-xs tracking-[0.2em] text-slate-500">
                    {mapel.nama_arab}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={currentValue}
                    onChange={(event) =>
                      setNilaiByMapel((current) => ({
                        ...current,
                        [mapel.id]: event.target.value,
                      }))
                    }
                    className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-2xl font-black text-slate-900 outline-none transition focus:border-emerald-500"
                  />
                  <span className="mt-3 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Predikat: {predikat}
                  </span>
                </label>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[1.75rem] border border-dashed border-slate-300 px-6 py-10 text-center text-slate-500">
            Data kelas belum tersedia. Jalankan seed Prisma terlebih dahulu lalu pilih kelas santri.
          </div>
        )}
      </section>

      {error ? <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div> : null}

      <div className="flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push("/admin/dashboard")}
          className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
        >
          Batal
        </button>
        <button
          type="button"
          disabled={isPending || !selectedKelas || activeMapelList.length === 0}
          onClick={handleSubmit}
          className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isPending ? "Menyimpan..." : "Simpan Nilai Santri"}
        </button>
      </div>
    </div>
  );
}

