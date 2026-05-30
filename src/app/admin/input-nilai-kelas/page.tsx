import { requirePermission } from "@/lib/permission";
import { getProgramCatalog } from "@/lib/app-data";
import { getSession } from "@/lib/auth";
import { InputNilaiBulkClient } from "@/components/admin/input-nilai-bulk-client";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { getActiveDufahName } from "@/lib/absensi";

export const dynamic = "force-dynamic";

export default async function InputNilaiKelasPage() {
  await requirePermission("input_nilai");

  const session = await getSession();
  const programList = await getProgramCatalog();

  const isAdmin = session?.role === "ADMIN";
  const allowedKelasId = session?.kelasId ?? null;

  let activeFlags = { u1: true, u2: true, u3: true };
  const activeDufahName = await getActiveDufahName();
  if (activeDufahName) {
    const dufah = await prisma.dufah.findUnique({
      where: { nama: activeDufahName }
    });
    if (dufah) {
      activeFlags = { u1: dufah.usbu1Active, u2: dufah.usbu2Active, u3: dufah.usbu3Active };
    }
  }

  // Cek apakah punya akses ke kelas apapun (Admin bebas, Wali Kelas harus punya kelasId)
  if (!isAdmin && !allowedKelasId) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 min-h-[300px] text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-xl">!</div>
        <h3 className="text-xl font-bold text-slate-800">Akses Kelas Belum Diatur</h3>
        <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
          Akun Anda belum dihubungkan dengan kelas manapun. Silakan hubungi Super Admin untuk mengatur penugasan kelas Anda.
        </p>
        <Link 
          href="/admin/dashboard" 
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-4 rounded-xl transition-colors"
        >
          Kembali ke Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-700">
            Input Nilai Masal
          </p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">Input Nilai Per Kelas</h2>
        </div>
        <Link
          href="/admin/syahadah"
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          Kembali ke Data Syahadah
        </Link>
      </div>

      <InputNilaiBulkClient 
        programList={programList as any} 
        allowedKelasId={allowedKelasId}
        isAdmin={isAdmin}
        activeFlags={activeFlags}
      />
    </div>
  );
}
