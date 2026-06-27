"use client";

import { calculateStatus } from "@/lib/kelulusan";
import { getPredikat } from "@/lib/formatters";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { calcMapelNilaiAkhir, calcAkumulatif } from "@/lib/grade-calculator";

type MapelOption = {
  id: string;
  nama_indo: string;
  nama_arab: string;
  urutan: number;
  jumlah_tes: number;
  tampil_di_syahadah: boolean;
  masuk_akumulasi: boolean;
  bobot: number;
  bulan_aktif?: number;
  jumlah_tes_b2?: number | null;
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
  tempat_lahir?: string | null;
  tanggal_lahir?: string | null;
  alamat?: string | null;
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
  jumlah_kolom_usbu?: number | null;
  kelas?: any;
} | null;

function statusBadgeClass(status: string) {
  if (status === "LULUS") {
    return "bg-[var(--color-primary-100)] text-[var(--color-primary)]";
  }

  if (status === "MUSYAROKAH") {
    return "bg-[var(--color-warning-light)] text-[var(--color-warning)]";
  }

  return "bg-[var(--color-danger-light)] text-[var(--color-danger)]";
}

export function InputNilaiForm({
  santri,
  programList,
  internalSantri,
  activeRiwayat,
  activeFlags,
  allRiwayat,
  jumlahKolomUsbu: initialJumlahKolomUsbu,
}: {
  santri: MasterSantri;
  programList: ProgramOption[];
  internalSantri: InternalSantri;
  activeRiwayat: ActiveRiwayat;
  activeFlags: { u1: boolean; u2: boolean; u3: boolean };
  allRiwayat: any[];
  jumlahKolomUsbu: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [selectedKelasId, setSelectedKelasId] = useState(
    activeRiwayat?.kelasId ?? "",
  );
  const [isTasmi, setIsTasmi] = useState<boolean>(activeRiwayat?.is_tasmi ?? false);
  const [jumlahKolomUsbu, setJumlahKolomUsbu] = useState<number>(activeRiwayat?.jumlah_kolom_usbu ?? initialJumlahKolomUsbu);
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

  const isAkbarnas = selectedProgram?.nama_indo.toLowerCase().includes("akbarnas") ?? false;
  const akbarnasHistoricalCount = (allRiwayat ?? []).filter((r: any) => 
    r.id !== activeRiwayat?.id && 
    programList.find((p) => p.id === r.programId)?.nama_indo.toLowerCase().includes("akbarnas")
  ).length;
  const isMonth2 = isAkbarnas && akbarnasHistoricalCount > 0;

  const activeMapelList = (selectedProgram?.mapelList ?? []).filter((mapel) => {
    if (!isAkbarnas) return true;
    if (isMonth2) {
      return mapel.bulan_aktif !== 1;
    } else {
      return mapel.bulan_aktif !== 2;
    }
  }).map((mapel) => {
    if (isMonth2 && mapel.jumlah_tes_b2 !== null && mapel.jumlah_tes_b2 !== undefined) {
      return { ...mapel, jumlah_tes: mapel.jumlah_tes_b2 };
    }
    return mapel;
  });

  const parsedNilai = activeMapelList.map((mapel) => {
    const val = nilaiByMapel[mapel.id] || { u1: "", u2: "", n: "", a: "" };
    const currU1 = val.u1 === "" ? null : Number(val.u1);
    const currU2 = val.u2 === "" ? null : Number(val.u2);
    const currN = val.n === "" ? null : Number(val.n);

    let currA = null;
    if (mapel.jumlah_tes === 1 || jumlahKolomUsbu === 1) {
      // mode 1: use Nihai instead of direct a
      currA = currN;
    } else if (jumlahKolomUsbu === 2) {
      if (currU1 !== null && currU2 !== null) {
        currA = Number((currU1 * 0.4 + currU2 * 0.6).toFixed(2));
      }
    } else {
      currA = calcMapelNilaiAkhir({ u1: currU1, u2: currU2, n: currN }, isAkbarnas);
    }

    return {
      mapelId: mapel.id,
      u1: (mapel.jumlah_tes === 1 || jumlahKolomUsbu === 1) ? null : currU1,
      u2: (mapel.jumlah_tes === 1 || jumlahKolomUsbu === 1) ? null : currU2,
      n: (mapel.jumlah_tes === 1 || jumlahKolomUsbu === 2) ? null : currN,
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
      if (mapel.jumlah_tes === 1 || jumlahKolomUsbu === 1) {
        return val.n.trim() === ""; // now using n
      }
      if (jumlahKolomUsbu === 2) {
        if (activeFlags.u1 && val.u1.trim() === "") return true;
        if (activeFlags.u2 && val.u2.trim() === "") return true;
        return false;
      }
      // Normal 3 columns
      if (activeFlags.u1 && val.u1.trim() === "") return true;
      if (activeFlags.u2 && val.u2.trim() === "") return true;
      if (activeFlags.u3 && val.n.trim() === "") return true;
      return false;
    });

  const numericNilai = parsedNilai.filter(n => n.a !== null && n.masuk_akumulasi);

  const average = calcAkumulatif(numericNilai.map(n => ({ score: n.skor, bobot: n.bobot })));
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

    // Validasi ini dimatikan agar admin bisa menyimpan nilai sebagian (draft)
    // if (hasIncompleteNilai) {
    //   setError("Semua nilai mapel wajib diisi.");
    //   return;
    // }

    startTransition(async () => {
      const response = await fetch(`/api/admin/santri/${santri.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          kelasId: selectedKelasId,
          is_tasmi: isTasmi,
          jumlah_kolom_usbu: jumlahKolomUsbu,
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
      <section className="grid gap-4 neu-card-white p-6 md:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--color-primary)]">
              Master Santri
            </p>
            <h2 className="mt-2 text-3xl font-bold text-[var(--color-text)] flex items-center flex-wrap gap-2">
              {santri.nama}
              {activeRiwayat?.kelasId && (
                <span className="rounded-full bg-[var(--color-primary-100)] px-3 py-1 text-sm font-semibold text-[var(--color-primary-dark)]">
                  {programList.find(p => p.kelasList.some(k => k.id === activeRiwayat.kelasId))?.kelasList.find(k => k.id === activeRiwayat.kelasId)?.nama || "Kelas"}
                </span>
              )}
            </h2>
          </div>
          <div className="grid gap-3 text-sm text-[var(--color-text-muted)] md:grid-cols-2">
            <div className="rounded-3xl bg-[var(--color-secondary)] px-4 py-3">
              <p className="font-semibold text-[var(--color-text)]">Gender</p>
              <p>{santri.gender}</p>
            </div>
            <div className="rounded-3xl bg-[var(--color-secondary)] px-4 py-3">
              <p className="font-semibold text-[var(--color-text)]">Duf&apos;ah</p>
              <p>{santri.dufahNama}</p>
            </div>
            <div className="rounded-3xl bg-[var(--color-secondary)] px-4 py-3 md:col-span-2">
              <p className="font-semibold text-[var(--color-text)]">Lokasi</p>
              <p>
                {santri.sakan} / {santri.kamar} / {santri.nomorLemari}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-[1.75rem] bg-[var(--color-text)] p-5 text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--color-text-subtle)]">
            Preview Kelulusan
          </p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className={`rounded-full px-4 py-2 text-sm font-bold ${statusBadgeClass(previewStatus)}`}>
              {previewStatus}
            </span>
            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-subtle)]">Rata-rata</p>
              <p className="text-3xl font-black">{average.toFixed(1)}</p>
            </div>
          </div>
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
            <p className="font-semibold text-white">Predikat rata-rata</p>
            <p className="mt-1 text-[var(--color-text-subtle)]">{averagePredikat.indo}</p>
          </div>
          <p className="mt-4 text-xs leading-6 text-[var(--color-text-subtle)]">
            Syahadah hanya aktif saat Tasmi&apos; lulus. Jika ada nilai di bawah KKM, status otomatis menjadi MUSYAROKAH.
          </p>
        </div>
      </section>


      <section className="neu-card-white p-6">
        <div className="grid gap-6 md:grid-cols-2">
          {!activeRiwayat?.kelasId && (
          <label className="space-y-2 text-sm font-semibold text-[var(--color-text)]">
            <span>Pilih Ruangan Kelas</span>
            <select
              value={selectedKelasId}
              onChange={(e) => setSelectedKelasId(e.target.value)}
              disabled={!!activeRiwayat?.kelasId}
              className={`w-full rounded-2xl border bg-[var(--color-secondary)] px-4 py-3 text-base font-bold outline-none transition ${!!activeRiwayat?.kelasId
                  ? "border-[var(--color-surface-dark)] text-[var(--color-text-muted)] cursor-not-allowed opacity-80"
                  : "border-[var(--color-surface-dark)] text-[var(--color-text)] focus:border-[var(--color-primary)] focus:bg-white"
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
            <label className="flex items-center gap-3 rounded-3xl border border-[var(--color-surface-dark)] bg-[var(--color-secondary)] px-4 py-3 text-sm font-semibold text-[var(--color-text)]">
              <input
                type="checkbox"
                checked={isTasmi}
                onChange={(event) => setIsTasmi(event.target.checked)}
                className="h-5 w-5 rounded border-[var(--color-surface-dark)] text-[var(--color-primary)]"
              />
              Sudah Tasmi&apos;
            </label>
            <label className="flex items-center gap-3 rounded-3xl border border-[var(--color-surface-dark)] bg-[var(--color-secondary)] px-4 py-3 text-sm font-semibold text-[var(--color-text)]">
              <span className="shrink-0">Mode Usbuain:</span>
              <select
                value={jumlahKolomUsbu}
                onChange={(e) => setJumlahKolomUsbu(Number(e.target.value))}
                className="w-full bg-transparent outline-none cursor-pointer text-[var(--color-primary)] font-bold"
              >
                <option value={0}>Normal (3 Kolom)</option>
                <option value={2}>Usbuain (2 Kolom)</option>
                <option value={1}>Usbuain (1 Kolom)</option>
              </select>
            </label>
          </div>
        </div>
      </section>

      <section className="neu-card-white p-6">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--color-primary)]">
              Input Nilai
            </p>
            <div className="flex items-center gap-3 mt-2">
              <h3 className="text-2xl font-bold text-[var(--color-text)]">
                {selectedProgram ? `${selectedProgram.nama_indo} - KKM ${selectedProgram.kkm}` : "Pilih kelas untuk menampilkan mapel"}
              </h3>
              {isAkbarnas && (
                <span className={`px-3 py-1 text-xs font-bold rounded-full ${isMonth2 ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 text-purple-700'}`}>
                  {isMonth2 ? 'Bulan 2 (Riwayat Lanjutan)' : 'Bulan 1 (Riwayat Baru)'}
                </span>
              )}
            </div>
          </div>
          <p className="text-sm text-[var(--color-text-muted)]">Skor wajib berupa angka 0-100.</p>
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
                  className="rounded-[1.75rem] border border-[var(--color-surface-dark)] bg-[var(--color-secondary)] px-4 py-4 transition hover:border-[var(--color-primary-100)] hover:bg-white flex flex-col"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="block text-sm font-bold text-[var(--color-text)]">{mapel.nama_indo}</span>
                      <span className="mt-1 block text-xs tracking-[0.2em] text-[var(--color-text-muted)] mb-4">
                        {mapel.nama_arab}
                      </span>
                    </div>
                    {isAkbarnas && (
                      <span className={`shrink-0 px-2 py-1 rounded text-[10px] font-bold ${mapel.bulan_aktif === 1 ? 'bg-purple-100 text-purple-700' : mapel.bulan_aktif === 2 ? 'bg-indigo-100 text-indigo-700' : 'bg-[var(--color-surface-dark)] text-[var(--color-text-muted)]'}`}>
                        {mapel.bulan_aktif === 1 ? "Bulan 1" : mapel.bulan_aktif === 2 ? "Bulan 2" : "Bulan 1 & 2"}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-auto">
                    {mapel.jumlah_tes === 3 && jumlahKolomUsbu === 0 ? (
                      <>
                        <div>
                          <p className={`text-[10px] uppercase font-bold text-center mb-1 ${activeFlags.u1 ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-subtle)]'}`}>Usbu' 1</p>
                          {activeFlags.u1 ? (
                          <input
                            type="number" min={0} max={100} value={val.u1}
                            onChange={(e) => setNilaiByMapel(c => ({ ...c, [mapel.id]: { ...c[mapel.id] || val, u1: e.target.value } }))}
                            className="w-full rounded-xl border border-[var(--color-primary-100)] bg-[var(--color-primary-50)]/50 px-2 py-2 text-center text-sm font-black text-[var(--color-primary-dark)] outline-none transition focus:border-[var(--color-primary)] focus:bg-white"
                          />
                          ) : (
                            <div className="w-full rounded-xl border border-[var(--color-surface)] bg-[var(--color-secondary)] px-2 py-2 text-center text-sm font-bold text-[var(--color-text-subtle)]">{val.u1 || "-"}</div>
                          )}
                        </div>
                        <div>
                          <p className={`text-[10px] uppercase font-bold text-center mb-1 ${activeFlags.u2 ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-subtle)]'}`}>Usbu' 2</p>
                          {activeFlags.u2 ? (
                          <input
                            type="number" min={0} max={100} value={val.u2}
                            onChange={(e) => setNilaiByMapel(c => ({ ...c, [mapel.id]: { ...c[mapel.id] || val, u2: e.target.value } }))}
                            className="w-full rounded-xl border border-[var(--color-primary-100)] bg-[var(--color-primary-50)]/50 px-2 py-2 text-center text-sm font-black text-[var(--color-primary-dark)] outline-none transition focus:border-[var(--color-primary)] focus:bg-white"
                          />
                          ) : (
                            <div className="w-full rounded-xl border border-[var(--color-surface)] bg-[var(--color-secondary)] px-2 py-2 text-center text-sm font-bold text-[var(--color-text-subtle)]">{val.u2 || "-"}</div>
                          )}
                        </div>
                        <div>
                          <p className={`text-[10px] uppercase font-bold text-center mb-1 ${activeFlags.u3 ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-subtle)]'}`}>Nihai</p>
                          {activeFlags.u3 ? (
                          <input
                            type="number" min={0} max={100} value={val.n}
                            onChange={(e) => setNilaiByMapel(c => ({ ...c, [mapel.id]: { ...c[mapel.id] || val, n: e.target.value } }))}
                            className="w-full rounded-xl border border-[var(--color-primary-100)] bg-[var(--color-primary-50)]/50 px-2 py-2 text-center text-sm font-black text-[var(--color-primary-dark)] outline-none transition focus:border-[var(--color-primary)] focus:bg-white"
                          />
                          ) : (
                            <div className="w-full rounded-xl border border-[var(--color-surface)] bg-[var(--color-secondary)] px-2 py-2 text-center text-sm font-bold text-[var(--color-text-subtle)]">{val.n || "-"}</div>
                          )}
                        </div>
                      </>
                    ) : mapel.jumlah_tes === 3 && jumlahKolomUsbu === 2 ? (
                      <>
                        <div className="col-span-1"></div>
                        <div>
                          <p className={`text-[10px] uppercase font-bold text-center mb-1 ${activeFlags.u1 ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-subtle)]'}`}>Usbu' 1</p>
                          {activeFlags.u1 ? (
                          <input
                            type="number" min={0} max={100} value={val.u1}
                            onChange={(e) => setNilaiByMapel(c => ({ ...c, [mapel.id]: { ...c[mapel.id] || val, u1: e.target.value } }))}
                            className="w-full rounded-xl border border-[var(--color-primary-100)] bg-[var(--color-primary-50)]/50 px-2 py-2 text-center text-sm font-black text-[var(--color-primary-dark)] outline-none transition focus:border-[var(--color-primary)] focus:bg-white"
                          />
                          ) : (
                            <div className="w-full rounded-xl border border-[var(--color-surface)] bg-[var(--color-secondary)] px-2 py-2 text-center text-sm font-bold text-[var(--color-text-subtle)]">{val.u1 || "-"}</div>
                          )}
                        </div>
                        <div>
                          <p className={`text-[10px] uppercase font-bold text-center mb-1 ${activeFlags.u2 ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-subtle)]'}`}>Usbu' 2</p>
                          {activeFlags.u2 ? (
                          <input
                            type="number" min={0} max={100} value={val.u2}
                            onChange={(e) => setNilaiByMapel(c => ({ ...c, [mapel.id]: { ...c[mapel.id] || val, u2: e.target.value } }))}
                            className="w-full rounded-xl border border-[var(--color-primary-100)] bg-[var(--color-primary-50)]/50 px-2 py-2 text-center text-sm font-black text-[var(--color-primary-dark)] outline-none transition focus:border-[var(--color-primary)] focus:bg-white"
                          />
                          ) : (
                            <div className="w-full rounded-xl border border-[var(--color-surface)] bg-[var(--color-secondary)] px-2 py-2 text-center text-sm font-bold text-[var(--color-text-subtle)]">{val.u2 || "-"}</div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="col-span-3">
                        <p className={`text-[10px] uppercase font-bold text-center mb-1 text-[var(--color-primary)]`}>{mapel.jumlah_tes === 1 ? "Nilai Langsung" : "Nihai"}</p>
                        <input
                          type="number" min={0} max={100} value={mapel.jumlah_tes === 1 ? val.a : val.n}
                          onChange={(e) => setNilaiByMapel(c => ({ ...c, [mapel.id]: { ...c[mapel.id] || val, [mapel.jumlah_tes === 1 ? "a" : "n"]: e.target.value } }))}
                          className="w-full rounded-xl border border-[var(--color-primary-100)] bg-[var(--color-primary-50)]/50 px-2 py-2 text-center text-sm font-black text-[var(--color-primary-dark)] outline-none transition focus:border-[var(--color-primary)] focus:bg-white"
                        />
                      </div>
                    )}
                  </div>

                  <div className="mt-4 bg-[var(--color-surface)] rounded-xl p-2 flex justify-between items-center px-4">
                    <div>
                      <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
                        Nilai Akhir
                      </span>
                      <span className="block text-xs font-bold text-[var(--color-primary)]">
                        {predikat}
                      </span>
                    </div>
                    <span className="text-xl font-black text-[var(--color-text)]">
                      {currentParsed?.a !== null ? currentParsed?.a : "-"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[1.75rem] border border-dashed border-[var(--color-surface-dark)] px-6 py-10 text-center text-[var(--color-text-muted)]">
            Data kelas belum tersedia. Jalankan seed Prisma terlebih dahulu lalu pilih kelas santri.
          </div>
        )}
      </section>

      {error ? <div className="rounded-3xl border border-[var(--color-danger)] bg-[var(--color-danger-light)] px-4 py-3 text-sm font-medium text-[var(--color-danger)]">{error}</div> : null}

      <div className="flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push("/admin/syahadah")}
          className="rounded-full border border-[var(--color-surface-dark)] px-5 py-3 text-sm font-semibold text-[var(--color-text)] transition hover:border-[var(--color-surface-dark)] hover:bg-[var(--color-secondary)]"
        >
          Batal
        </button>
        <button
          type="button"
          disabled={isPending || !selectedProgram || activeMapelList.length === 0}
          onClick={handleSubmit}
          className="rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:bg-[var(--color-surface-dark)]"
        >
          {isPending ? "Menyimpan..." : "Simpan Nilai Santri"}
        </button>
      </div>
    </div>
  );
}

