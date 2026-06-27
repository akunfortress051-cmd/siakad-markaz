"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Save, Printer } from "lucide-react";

export function CetakUsbuSelector({ kelasList, isRestricted = false }: { kelasList: { id: string, nama: string, programNama: string }[], isRestricted?: boolean }) {
  const router = useRouter();
  const [kelasId, setKelasId] = useState<string>("");
  const [usbu, setUsbu] = useState<string>("1");
  const [bulan, setBulan] = useState<string>("1");

  const selectedKelas = kelasList.find(k => k.id === kelasId);
  const isAkbarnas = selectedKelas?.programNama.toLowerCase().includes("akbarnas");

  const handlePrint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kelasId) {
      toast.error("Silakan pilih ruangan kelas terlebih dahulu!");
      return;
    }
    if (kelasId === "ALL") {
      router.push(`/admin/cetak-usbu/bulk/${usbu}`);
      return;
    }
    const searchParams = isAkbarnas ? `?bulan=${bulan}` : "";
    router.push(`/admin/cetak-usbu/${kelasId}/${usbu}${searchParams}`);
  };

  return (
    <form onSubmit={handlePrint} className="flex flex-col gap-6">
      <label className="space-y-2 text-sm font-semibold text-[var(--color-text)]">
        <span>Ruangan Kelas</span>
        <select
          value={kelasId}
          onChange={(e) => setKelasId(e.target.value)}
          className="w-full rounded-2xl border border-[var(--color-surface-dark)] bg-[var(--color-secondary)] px-4 py-3 text-sm font-semibold text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:bg-white"
        >
          <option value="" disabled>Pilih Ruangan Kelas...</option>
          {!isRestricted && (
            <option value="ALL" className="font-bold text-[var(--color-warning)]">-- Semua Ruangan Kelas (Cetak Bulk) --</option>
          )}
          {kelasList.map(k => (
            <option key={k.id} value={k.id}>
              {k.nama} ({k.programNama})
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-2 text-sm font-semibold text-[var(--color-text)]">
        <span>Fase Evaluasi (Pekan)</span>
        <select
          value={usbu}
          onChange={(e) => setUsbu(e.target.value)}
          className="w-full rounded-2xl border border-[var(--color-surface-dark)] bg-[var(--color-secondary)] px-4 py-3 text-sm font-semibold text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:bg-white"
        >
          <option value="1">Ujian Usbu' 1</option>
          <option value="2">Ujian Usbu' 2</option>
          <option value="3">Ujian Nihai</option>
          <option value="4">Semua Usbu'</option>
        </select>
      </label>

      {isAkbarnas && (
        <label className="space-y-2 text-sm font-semibold text-[var(--color-text)]">
          <span>Bulan (Khusus Akbarnas)</span>
          <select
            value={bulan}
            onChange={(e) => setBulan(e.target.value)}
            className="w-full rounded-2xl border border-[var(--color-surface-dark)] bg-[var(--color-secondary)] px-4 py-3 text-sm font-semibold text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:bg-white"
          >
            <option value="1">Bulan 1</option>
            <option value="2">Bulan 2</option>
            <option value="gabungan">Gabungan Bulan 1 & 2</option>
          </select>
        </label>
      )}

      <button
        type="submit"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-6 py-4 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-[var(--color-primary)] hover:-translate-y-0.5"
      >
        <Printer className="h-4 w-4" />
        Buka Lembar Pencetakan
      </button>
    </form>
  )
}
