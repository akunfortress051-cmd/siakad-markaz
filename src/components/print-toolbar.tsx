"use client";

import Link from "next/link";

export function PrintToolbar({
  backHref,
  backLabel,
  maxWidth = "330mm",
}: {
  backHref: string;
  backLabel: string;
  maxWidth?: string;
}) {
  return (
    <div className="mx-auto mb-6 flex w-full items-center justify-between gap-3 print:hidden" style={{ maxWidth }}>
      <Link
        href={backHref}
        className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
      >
        {backLabel}
      </Link>
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
      >
        Cetak Dokumen
      </button>
    </div>
  );
}
