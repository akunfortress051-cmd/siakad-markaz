import { getSession } from "@/lib/auth";
import TasrihDigital from "@/components/public/tasrih-digital";
import { notFound } from "next/navigation";

export default async function PublicTasrihPage(props: { params: Promise<{ grupId: string }> }) {
  const params = await props.params;

  // We fetch directly from the database here or we can call our own API
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/public/perizinan/tasrih/${params.grupId}`, {
    cache: "no-store"
  });

  if (!res.ok) {
    if (res.status === 404) return notFound();
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-md w-full">
          <div className="text-red-500 font-bold mb-2">Terjadi Kesalahan</div>
          <p className="text-slate-500 text-sm">Gagal memuat detail tasrih perizinan. Silakan coba lagi nanti.</p>
        </div>
      </div>
    );
  }

  const tasrihData = await res.json();
  tasrihData.grupId = params.grupId;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 flex flex-col items-center">
      <div className="w-full max-w-md mb-6 flex items-center justify-between">
        <a href="/perizinan" className="text-sm font-bold text-[var(--color-primary)] hover:underline">
          &larr; Kembali
        </a>
        <h1 className="text-xl font-black text-slate-800">Verifikasi Izin</h1>
      </div>
      <TasrihDigital data={tasrihData} />
    </div>
  );
}
