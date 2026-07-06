"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";

export default function UjianSelesaiPage() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/tauzi/auth/logout', { method: 'POST' });
      router.push('/tauzi/login');
      router.refresh();
    } catch {
      toast.error('Gagal keluar');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      <div className="w-full max-w-md neu-card p-8 rounded-3xl text-center flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mb-6 text-green-500">
          <CheckCircle2 size={48} />
        </div>
        <h2 className="text-2xl font-bold font-display mb-2" style={{ color: "var(--color-text)" }}>Alhamdulillah</h2>
        <p className="text-sm text-gray-500 mb-8 font-medium">
          Ujian Syafawi / Tulis Anda telah berhasil dikumpulkan. Silakan ikuti tes muqobalah kepada pengajar dan tunggu hasil rekomendasi kelulusan.
        </p>

        <button 
          onClick={handleLogout}
          className="px-6 py-3 rounded-xl font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors w-full"
        >
          Keluar
        </button>
      </div>
    </div>
  );
}
