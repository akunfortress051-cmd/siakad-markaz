"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Save, Printer } from "lucide-react";

export function CetakUsbuSelector({ kelasList }: { kelasList: { id: string, nama: string, programNama: string }[] }) {
  const router = useRouter();
  const [kelasId, setKelasId] = useState<string>("");
  const [usbu, setUsbu] = useState<string>("1");

  const handlePrint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kelasId) {
      toast.error("Silakan pilih ruangan kelas terlebih dahulu!");
      return;
    }
    router.push(`/admin/cetak-usbu/${kelasId}/${usbu}`);
  };

  return (
    <form onSubmit={handlePrint} className="flex flex-col gap-6">
      <label className="space-y-2 text-sm font-semibold text-slate-700">
        <span>Ruangan Kelas</span>
        <select
          value={kelasId}
          onChange={(e) => setKelasId(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white"
        >
          <option value="" disabled>Pilih Ruangan Kelas...</option>
          {kelasList.map(k => (
            <option key={k.id} value={k.id}>
              {k.nama} ({k.programNama})
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-2 text-sm font-semibold text-slate-700">
        <span>Fase Evaluasi (Pekan)</span>
        <select
          value={usbu}
          onChange={(e) => setUsbu(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white"
        >
          <option value="1">Ujian Usbu' 1</option>
          <option value="2">Ujian Usbu' 2</option>
          <option value="3">Ujian Nihai</option>
        </select>
      </label>

      <button
        type="submit"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 hover:-translate-y-0.5"
      >
        <Printer className="h-4 w-4" />
        Buka Lembar Pencetakan
      </button>
    </form>
  )
}
