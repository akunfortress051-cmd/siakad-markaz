import { InputNilaiForm } from "@/components/admin/input-nilai-form";
import { getSantriFormData } from "@/lib/app-data";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function InputNilaiPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getSantriFormData(id);

  if (!data) {
    notFound();
  }

  const session = await getSession();
  let hasAccess = false;

  if (session) {
    if (session.role === "ADMIN") {
      hasAccess = true;
    } else if (session.role === "WALI_KELAS") {
      // Wali Kelas harus terhubung dengan kelas santri ini
      hasAccess = session.kelasId === data.activeRiwayat?.kelasId;
    } else if (session.role === "PENGAJAR") {
      // Pengajar harus memiliki minimal satu sesi plotting di kelas santri ini
      if (data.activeRiwayat?.kelasId) {
        const ps = await prisma.pengajarSesi.findFirst({
          where: {
            userId: session.userId,
            kelasId: data.activeRiwayat.kelasId
          }
        });
        hasAccess = !!ps;
      }
    } else {
      // Periksa role kustom / lainnya: jika punya permission 'input_nilai', berikan akses
      const perm = await prisma.rolePermission.findFirst({
        where: {
          role: session.role as any,
          permission: "input_nilai"
        }
      });
      hasAccess = !!perm;
    }
  }

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 min-h-[300px] text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-xl">!</div>
        <h3 className="text-xl font-bold text-slate-800">Akses Ditolak</h3>
        <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
          Anda tidak memiliki izin untuk menginput nilai santri ini karena kelas santri tidak terhubung dengan tugas mengajar Anda.
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
            Input Nilai
          </p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">Penilaian santri per kelas dan mapel</h2>
        </div>
        <Link
          href="/admin/syahadah"
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          Kembali ke Data Syahadah
        </Link>
      </div>

      <InputNilaiForm
        santri={data.masterSantri}
        activeFlags={data.activeFlags}
        programList={data.programList}
        internalSantri={data.internalSantri} 
        activeRiwayat={data.activeRiwayat} 
      />
    </div>
  );
}
