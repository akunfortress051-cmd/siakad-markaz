import { getBaseUrl } from "@/lib/base-url";
import { Metadata } from "next";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/permission";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pilih Program - Layout Editor Syahadah",
};

export default async function LayoutEditorIndexPage() {
  await requirePermission("layout_syahadah");
  const programs = await prisma.program.findMany({
    orderBy: { nama_indo: "asc" },
  });

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Layout Editor Syahadah</h1>
            <p className="mt-1 text-sm text-slate-600">Pilih program yang ingin diatur layout syahadahnya</p>
          </div>
          <Link
            href="/admin/syahadah"
            className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            ← Kembali
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map((prog) => {
            const isTurats = (prog as any).kategori === "TURATS";
            return (
              <Link
                key={prog.id}
                href={`/layout-editor/${prog.id}`}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-300 hover:shadow-md"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-slate-800 group-hover:text-blue-700">{prog.nama_indo}</h3>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      isTurats
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}>
                      {isTurats ? "Turats" : "Reguler"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500 font-arabic" dir="rtl">{prog.nama_arab}</p>
                </div>
                <div className="mt-6 flex items-center text-sm font-semibold text-blue-600">
                  Atur Layout <span className="ml-1 transition-transform group-hover:translate-x-1">→</span>
                </div>
              </Link>
            );
          })}

          {/* Global Fallback (opsional jika ingin tetap bisa set default global) */}
          <Link
            href={`/layout-editor/global`}
            className="group flex flex-col justify-between rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-6 transition hover:border-slate-400 hover:bg-slate-100"
          >
            <div>
              <h3 className="font-bold text-slate-700">Template Global (Default)</h3>
              <p className="mt-1 text-sm text-slate-500">Digunakan jika program tidak memiliki layout khusus.</p>
            </div>
            <div className="mt-6 flex items-center text-sm font-semibold text-slate-600">
              Atur Layout <span className="ml-1 transition-transform group-hover:translate-x-1">→</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
