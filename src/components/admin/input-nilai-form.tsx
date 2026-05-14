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
  jumlah_tes: number;
  tampil_di_syahadah: boolean;
  masuk_akumulasi: boolean;
  bobot: number;
};

type ProgramOption = {
  id: string;
  nama_indo: string;
  nama_arab: string;
  kkm: number;
  mapelList: MapelOption[];
  kelasList: Array<{
    id: string;
    nama: string;
  }>;
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
  tempat_lahir: string;
  tanggal_lahir: string;
  alamat: string;
} | null;

type ActiveRiwayat = {
  id: string;
  dufahNama: string;
  programId: string | null;
  kelasId: string | null;
  is_tasmi: boolean;
  status_kelulusan: string;
  nilaiList: Array<{
    mapelId: string;
    nilaiUsbu1: number | null;
    nilaiUsbu2: number | null;
    nilaiNihai: number | null;
    nilaiAkhir: number | null;
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
  programList,
  internalSantri,
  activeRiwayat,
  activeFlags,
}: {
  santri: MasterSantri;
  programList: ProgramOption[];
  internalSantri: InternalSantri;
  activeRiwayat: ActiveRiwayat;
  activeFlags: { u1: boolean; u2: boolean; u3: boolean };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [selectedKelasId, setSelectedKelasId] = useState(
    activeRiwayat?.kelasId ?? "",
  );
  const [tempatLahir, setTempatLahir] = useState(internalSantri?.tempat_lahir ?? "");
  const [tanggalLahir, setTanggalLahir] = useState(internalSantri?.tanggal_lahir ?? "");
  const [alamat, setAlamat] = useState(internalSantri?.alamat ?? "");
  const [isTasmi, setIsTasmi] = useState(activeRiwayat?.is_tasmi ?? false);
  const [nilaiByMapel, setNilaiByMapel] = useState<Record<string, { u1: string, u2: string, n: string, a: string }>>(() => {
    return Object.fromEntries(
      (activeRiwayat?.nilaiList ?? []).map((nilai) => [
        nilai.mapelId,
        {
          u1: nilai.nilaiUsbu1 !== null && nilai.nilaiUsbu1 !== undefined ? String(nilai.nilaiUsbu1) : "",
          u2: nilai.nilaiUsbu2 !== null && nilai.nilaiUsbu2 !== undefined ? String(nilai.nilaiUsbu2) : "",
          n: nilai.nilaiNihai !== null && nilai.nilaiNihai !== undefined ? String(nilai.nilaiNihai) : "",
          a: nilai.nilaiAkhir !== null && nilai.nilaiAkhir !== undefined ? String(nilai.nilaiAkhir) : "",
        }
      ]),
    );
  });

  const selectedProgram = programList.find((program) =>
    program.kelasList.some((k) => k.id === selectedKelasId)
  ) ?? null;
  const activeMapelList = selectedProgram?.mapelList ?? [];

  const parsedNilai = activeMapelList.map((mapel) => {
    const val = nilaiByMapel[mapel.id] || { u1: "", u2: "", n: "", a: "" };
    const currU1 = val.u1 === "" ? null : Number(val.u1);
    const currU2 = val.u2 === "" ? null : Number(val.u2);
    const currN = val.n === "" ? null : Number(val.n);

    const currA = mapel.jumlah_tes === 1 ? (val.a === "" ? null : Number(val.a)) :
      ((currU1 !== null || currU2 !== null || currN !== null) ? Math.round(((currU1 || 0) * 0.3) + ((currU2 || 0) * 0.3) + ((currN || 0) * 0.4)) : null);

    return {
      mapelId: mapel.id,
      u1: mapel.jumlah_tes === 1 ? null : currU1,
      u2: mapel.jumlah_tes === 1 ? null : currU2,
      n: mapel.jumlah_tes === 1 ? null : currN,
      a: currA,
      skor: currA || 0,
      masuk_akumulasi: mapel.masuk_akumulasi,
      bobot: mapel.bobot ?? 1,
    };
  });
  const hasIncompleteNilai =
    !selectedProgram ||
    activeMapelList.some((mapel) => {
      const val = nilaiByMapel[mapel.id];
      if (!val) return true;
      if (mapel.jumlah_tes === 1) {
        return val.a.trim() === "";
      }
      if (activeFlags.u1 && val.u1.trim() === "") return true;
      if (activeFlags.u2 && val.u2.trim() === "") return true;
      if (activeFlags.u3 && val.n.trim() === "") return true;
      return false;
    });

  const numericNilai = parsedNilai.filter(n => n.a !== null && n.masuk_akumulasi);

  const totalSkorBobot = numericNilai.reduce((total, nilai) => total + (nilai.skor * nilai.bobot), 0);

  const average = numericNilai.length > 0 ? totalSkorBobot / 100 : 0;
  const averagePredikat = getPredikat(average);
  const previewStatus = !selectedProgram
    ? "TIDAK_LULUS"
    : !isTasmi
      ? "TIDAK_LULUS"
      : hasIncompleteNilai
        ? "MUSYAROKAH"
        : calculateStatus(
          { is_tasmi: isTasmi },
          numericNilai,
          selectedProgram,
        );

  const handleSubmit = () => {
    setError("");

    if (!selectedProgram) {
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
          kelasId: selectedKelasId,
          tempat_lahir: tempatLahir,
          tanggal_lahir: tanggalLahir,
          alamat: alamat,
          is_tasmi: isTasmi,
          nilaiList: parsedNilai.map((mapel) => ({
            mapelId: mapel.mapelId,
            nilaiUsbu1: mapel.u1,
            nilaiUsbu2: mapel.u2,
            nilaiNihai: mapel.n,
            nilaiAkhir: mapel.a,
          })),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? "Gagal menyimpan data nilai.");
        return;
      }

      router.push("/admin/syahadah");
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
            <h2 className="mt-2 text-3xl font-bold text-slate-900 flex items-center flex-wrap gap-2">
              {santri.nama}
              {activeRiwayat?.kelasId && (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
                  {programList.find(p => p.kelasList.some(k => k.id === activeRiwayat.kelasId))?.kelasList.find(k => k.id === activeRiwayat.kelasId)?.nama || "Kelas"}
                </span>
              )}
            </h2>
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
            Syahadah hanya aktif saat Tasmi&apos; lulus. Jika ada nilai di bawah KKM, status otomatis menjadi MUSYAROKAH.
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
          {!activeRiwayat?.kelasId && (
          <label className="space-y-2 text-sm font-semibold text-slate-700">
            <span>Pilih Ruangan Kelas</span>
            <select
              value={selectedKelasId}
              onChange={(e) => setSelectedKelasId(e.target.value)}
              disabled={!!activeRiwayat?.kelasId}
              className={`w-full rounded-2xl border bg-slate-50 px-4 py-3 text-base font-bold outline-none transition ${!!activeRiwayat?.kelasId
                  ? "border-slate-200 text-slate-500 cursor-not-allowed opacity-80"
                  : "border-slate-200 text-slate-900 focus:border-emerald-500 focus:bg-white"
                }`}
            >
              <option value="">-- Pilih Ruangan --</option>
              {programList.map((p) => (
                <optgroup key={p.id} label={p.nama_indo}>
                  {p.kelasList.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          )}
          <div className={`grid gap-3 md:grid-cols-2 ${!!activeRiwayat?.kelasId ? 'md:col-span-2' : ''}`}>
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
              {selectedProgram ? `${selectedProgram.nama_indo} - KKM ${selectedProgram.kkm}` : "Pilih kelas untuk menampilkan mapel"}
            </h3>
          </div>
          <p className="text-sm text-slate-500">Skor wajib berupa angka 0-100.</p>
        </div>

        {selectedProgram ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activeMapelList.map((mapel) => {
              const val = nilaiByMapel[mapel.id] || { u1: "", u2: "", n: "", a: "" };
              const currentParsed = parsedNilai.find(n => n.mapelId === mapel.id);
              const predikat = currentParsed && currentParsed.a !== null ? getPredikat(currentParsed.a).indo : "-";

              return (
                <div
                  key={mapel.id}
                  className="rounded-[1.75rem] border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-emerald-200 hover:bg-white flex flex-col"
                >
                  <span className="block text-sm font-bold text-slate-900">{mapel.nama_indo}</span>
                  <span className="mt-1 block text-xs tracking-[0.2em] text-slate-500 mb-4">
                    {mapel.nama_arab}
                  </span>

                  <div className="grid grid-cols-3 gap-2 mt-auto">
                    {mapel.jumlah_tes === 3 ? (
                      <>
                        <div>
                          <p className={`text-[10px] uppercase font-bold text-center mb-1 ${activeFlags.u1 ? 'text-emerald-600' : 'text-slate-400'}`}>Usbu' 1</p>
                          {activeFlags.u1 ? (
                          <input
                            type="number" min={0} max={100} value={val.u1}
                            onChange={(e) => setNilaiByMapel(c => ({ ...c, [mapel.id]: { ...c[mapel.id] || val, u1: e.target.value } }))}
                            className="w-full rounded-xl border border-emerald-300 bg-emerald-50/50 px-2 py-2 text-center text-sm font-black text-emerald-900 outline-none transition focus:border-emerald-500 focus:bg-white"
                          />
                          ) : (
                            <div className="w-full rounded-xl border border-slate-100 bg-slate-50 px-2 py-2 text-center text-sm font-bold text-slate-400">{val.u1 || "-"}</div>
                          )}
                        </div>
                        <div>
                          <p className={`text-[10px] uppercase font-bold text-center mb-1 ${activeFlags.u2 ? 'text-emerald-600' : 'text-slate-400'}`}>Usbu' 2</p>
                          {activeFlags.u2 ? (
                          <input
                            type="number" min={0} max={100} value={val.u2}
                            onChange={(e) => setNilaiByMapel(c => ({ ...c, [mapel.id]: { ...c[mapel.id] || val, u2: e.target.value } }))}
                            className="w-full rounded-xl border border-emerald-300 bg-emerald-50/50 px-2 py-2 text-center text-sm font-black text-emerald-900 outline-none transition focus:border-emerald-500 focus:bg-white"
                          />
                          ) : (
                            <div className="w-full rounded-xl border border-slate-100 bg-slate-50 px-2 py-2 text-center text-sm font-bold text-slate-400">{val.u2 || "-"}</div>
                          )}
                        </div>
                        <div>
                          <p className={`text-[10px] uppercase font-bold text-center mb-1 ${activeFlags.u3 ? 'text-emerald-600' : 'text-slate-400'}`}>Nihai</p>
                          {activeFlags.u3 ? (
                          <input
                            type="number" min={0} max={100} value={val.n}
                            onChange={(e) => setNilaiByMapel(c => ({ ...c, [mapel.id]: { ...c[mapel.id] || val, n: e.target.value } }))}
                            className="w-full rounded-xl border border-emerald-300 bg-emerald-50/50 px-2 py-2 text-center text-sm font-black text-emerald-900 outline-none transition focus:border-emerald-500 focus:bg-white"
                          />
                          ) : (
                            <div className="w-full rounded-xl border border-slate-100 bg-slate-50 px-2 py-2 text-center text-sm font-bold text-slate-400">{val.n || "-"}</div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="col-span-3">
                        <p className={`text-[10px] uppercase font-bold text-center mb-1 text-emerald-600`}>Nilai Langsung</p>
                        <input
                          type="number" min={0} max={100} value={val.a}
                          onChange={(e) => setNilaiByMapel(c => ({ ...c, [mapel.id]: { ...c[mapel.id] || val, a: e.target.value } }))}
                          className="w-full rounded-xl border border-emerald-300 bg-emerald-50/50 px-2 py-2 text-center text-sm font-black text-emerald-900 outline-none transition focus:border-emerald-500 focus:bg-white"
                        />
                      </div>
                    )}
                  </div>

                  <div className="mt-4 bg-slate-100 rounded-xl p-2 flex justify-between items-center px-4">
                    <div>
                      <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                        Nilai Akhir
                      </span>
                      <span className="block text-xs font-bold text-emerald-700">
                        {predikat}
                      </span>
                    </div>
                    <span className="text-xl font-black text-slate-800">
                      {currentParsed?.a !== null ? currentParsed?.a : "-"}
                    </span>
                  </div>
                </div>
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
          onClick={() => router.push("/admin/syahadah")}
          className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
        >
          Batal
        </button>
        <button
          type="button"
          disabled={isPending || !selectedProgram || activeMapelList.length === 0}
          onClick={handleSubmit}
          className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isPending ? "Menyimpan..." : "Simpan Nilai Santri"}
        </button>
      </div>
    </div>
  );
}

