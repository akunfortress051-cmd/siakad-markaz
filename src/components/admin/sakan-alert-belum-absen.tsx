"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

type SakanStatusData = {
  tanggal: string;
  totalSakan: number;
  belumAbsen: string[];
  sudahAbsen: string[];
};

export function SakanAlertBelumAbsen() {
  const [data, setData] = useState<SakanStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/absensi/rekap/sakan-status")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-48" />
      </div>
    );
  }

  if (!data) return null;

  if (data.belumAbsen.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 shrink-0">
          <CheckCircle2 className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-bold text-emerald-800">
            Semua sakan sudah absen hari ini ✓
          </p>
          <p className="text-xs font-medium text-emerald-600 mt-0.5">
            {data.sudahAbsen.length} sakan telah mengisi absensi ({data.tanggal})
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 flex items-start gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 text-rose-600 shrink-0 mt-0.5">
        <AlertTriangle className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-rose-800">
          ⚠️ {data.belumAbsen.length} Sakan belum mengisi absensi hari ini
        </p>
        <p className="text-xs font-medium text-rose-600 mt-0.5 mb-2">
          Tanggal: {data.tanggal} — {data.sudahAbsen.length}/{data.totalSakan} sakan sudah absen
        </p>
        <div className="flex flex-wrap gap-1.5">
          {data.belumAbsen.map((s) => (
            <span
              key={s}
              className="inline-flex items-center rounded-lg bg-rose-100 border border-rose-200 px-2.5 py-1 text-xs font-bold text-rose-700"
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
