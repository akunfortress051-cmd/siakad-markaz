"use client";

import { formatDateIndo, toDateInputValue, translateDateToArabic } from "@/lib/formatters";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type KelasSetting = {
  id: string;
  nama_indo: string;
  nama_arab: string;
  kkm: number;
  mapelList: Array<{
    id: string;
  }>;
};

type TemplateSetting = {
  id: number;
  tgl_cetak_indo: string;
  tgl_cetak_arab: string;
  nama_mudir_indo: string;
  nama_mudir_arab: string;
  jabatan_mudir_indo: string;
  jabatan_mudir_arab: string;
};

export function MasterDataForm({
  kelasList,
  template,
}: {
  kelasList: KelasSetting[];
  template: TemplateSetting;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [tanggalCetak, setTanggalCetak] = useState(
    toDateInputValue(template.tgl_cetak_indo) || new Date().toISOString().slice(0, 10),
  );
  const [templateState, setTemplateState] = useState({
    nama_mudir_indo: template.nama_mudir_indo,
    nama_mudir_arab: template.nama_mudir_arab,
    jabatan_mudir_indo: template.jabatan_mudir_indo,
    jabatan_mudir_arab: template.jabatan_mudir_arab,
  });
  const [kkmByKelas, setKkmByKelas] = useState<Record<string, string>>(() => {
    return Object.fromEntries(kelasList.map((kelas) => [kelas.id, String(kelas.kkm)]));
  });

  const previewDate = {
    indo: tanggalCetak ? formatDateIndo(tanggalCetak) : "",
    arab: tanggalCetak ? translateDateToArabic(tanggalCetak) : "",
  };

  const handleSubmit = () => {
    setMessage("");
    setError("");

    if (!tanggalCetak) {
      setError("Tanggal cetak wajib diisi.");
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/admin/master-data", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tanggalCetak,
          kelas: kelasList.map((kelas) => ({
            id: kelas.id,
            kkm: Number(kkmByKelas[kelas.id]),
          })),
          template: templateState,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? "Gagal menyimpan master data.");
        return;
      }

      setMessage("Master data berhasil diperbarui.");
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-700">
              Master KKM
            </p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">Pengaturan kelas dan ambang kelulusan</h2>
          </div>
          <p className="max-w-md text-right text-sm leading-6 text-slate-500">
            Perubahan KKM akan langsung memengaruhi penentuan status LULUS, MUSYAROKAH, atau TIDAK_LULUS.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {kelasList.map((kelas) => (
            <label key={kelas.id} className="rounded-[1.75rem] border border-slate-200 bg-slate-50 px-4 py-4">
              <span className="block text-base font-bold text-slate-900">{kelas.nama_indo}</span>
              <span className="mt-1 block text-xs tracking-[0.2em] text-slate-500">{kelas.nama_arab}</span>
              <span className="mt-3 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {kelas.mapelList.length} mapel
              </span>
              <input
                type="number"
                min={0}
                max={100}
                value={kkmByKelas[kelas.id] ?? ""}
                onChange={(event) =>
                  setKkmByKelas((current) => ({
                    ...current,
                    [kelas.id]: event.target.value,
                  }))
                }
                className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-2xl font-black text-slate-900 outline-none transition focus:border-emerald-500"
              />
            </label>
          ))}
        </div>
      </section>

      <section className="grid gap-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-700">
              Template Syahadah
            </p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">Tanggal cetak dan identitas mudir</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold text-slate-700 md:col-span-2">
              <span>Tanggal cetak</span>
              <input
                type="date"
                value={tanggalCetak}
                onChange={(event) => setTanggalCetak(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white"
              />
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-700">
              <span>Nama Mudir (Indonesia)</span>
              <input
                value={templateState.nama_mudir_indo}
                onChange={(event) => setTemplateState((current) => ({ ...current, nama_mudir_indo: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white"
              />
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-700">
              <span>Nama Mudir (Arab)</span>
              <input
                dir="rtl"
                value={templateState.nama_mudir_arab}
                onChange={(event) => setTemplateState((current) => ({ ...current, nama_mudir_arab: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white"
              />
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-700">
              <span>Jabatan Mudir (Indonesia)</span>
              <input
                value={templateState.jabatan_mudir_indo}
                onChange={(event) => setTemplateState((current) => ({ ...current, jabatan_mudir_indo: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white"
              />
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-700">
              <span>Jabatan Mudir (Arab)</span>
              <input
                dir="rtl"
                value={templateState.jabatan_mudir_arab}
                onChange={(event) => setTemplateState((current) => ({ ...current, jabatan_mudir_arab: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white"
              />
            </label>
          </div>
        </div>
        <div className="rounded-[1.75rem] bg-slate-900 p-5 text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-300">Preview Template</p>
          <div className="mt-5 space-y-4 text-sm leading-7 text-slate-200">
            <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="font-semibold text-white">Tanggal cetak (Indonesia)</p>
              <p>{previewDate.indo}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3" dir="rtl">
              <p className="font-semibold text-white">التاريخ بالعربية</p>
              <p>{previewDate.arab}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="font-semibold text-white">Penanda tangan</p>
              <p>{templateState.nama_mudir_indo}</p>
              <p className="text-slate-400">{templateState.jabatan_mudir_indo}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3" dir="rtl">
              <p className="font-semibold text-white">الموقع</p>
              <p>{templateState.nama_mudir_arab}</p>
              <p className="text-slate-400">{templateState.jabatan_mudir_arab}</p>
            </div>
          </div>
        </div>
      </section>

      {message ? <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</div> : null}
      {error ? <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div> : null}

      <div className="flex justify-end">
        <button
          type="button"
          disabled={isPending}
          onClick={handleSubmit}
          className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isPending ? "Menyimpan..." : "Simpan Master Data"}
        </button>
      </div>
    </div>
  );
}
