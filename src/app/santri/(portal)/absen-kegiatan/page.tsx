"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { MapPin, CheckCircle, Crosshair, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SantriAbsenMandiriPage() {
  const [kode, setKode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const router = useRouter();

  const handleAbsen = () => {
    if (!kode || kode.length !== 6) {
      toast.error("Kode harus terdiri dari 6 karakter");
      return;
    }

    if (!navigator.geolocation) {
      toast.error("Browser Anda tidak mendukung deteksi lokasi (GPS).");
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading("Mendeteksi lokasi Anda (pastikan GPS nyala)...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        toast.loading("Memvalidasi kode dan lokasi...", { id: toastId });

        try {
          const res = await fetch("/api/santri/absen-kegiatan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kode, latitude, longitude })
          });
          const data = await res.json();
          
          if (data.success) {
            toast.success(data.message, { id: toastId });
            setIsSuccess(true);
            setSuccessMsg(data.message);
          } else {
            toast.error(data.detail || data.error, { id: toastId, duration: 5000 });
            setIsLoading(false);
          }
        } catch {
          toast.error("Terjadi kesalahan koneksi.", { id: toastId });
          setIsLoading(false);
        }
      },
      (error) => {
        setIsLoading(false);
        let msg = "Gagal mendeteksi lokasi.";
        if (error.code === error.PERMISSION_DENIED) {
          msg = "Akses lokasi ditolak! Anda harus mengizinkan browser mengakses lokasi untuk melakukan absen mandiri.";
        }
        toast.error(msg, { id: toastId, duration: 5000 });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 space-y-6">
        <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center mb-2">
          <CheckCircle size={48} className="text-emerald-500 animate-pulse" />
        </div>
        <h1 className="text-2xl font-black text-center text-[var(--color-text)]">Absensi Berhasil!</h1>
        <p className="text-center font-bold text-gray-500 max-w-sm">
          {successMsg}
        </p>
        <button onClick={() => router.push("/santri/absensi")} className="neu-button-primary px-8 py-3 rounded-2xl flex items-center gap-2 mt-4 text-sm">
          Lihat Riwayat Absensi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 max-w-md mx-auto mt-4 px-2">
      <div className="flex flex-col gap-2 items-center text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-2" style={{ background: "var(--color-primary-50)" }}>
           <MapPin size={32} className="text-[var(--color-primary)]" />
        </div>
        <h1 className="text-3xl font-black text-[var(--color-text)]">
          Absen Mandiri
        </h1>
        <p className="text-sm font-semibold text-[var(--color-text-muted)] mt-1">
          Masukkan 6 digit kode yang ditampilkan, dan pastikan Anda berada di sekitar area kegiatan (lokasinya harus menyala).
        </p>
      </div>

      <div className="neu-card-white p-6 bg-white space-y-6">
        <div>
           <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 block text-center">KODE AKSES</label>
           <input
             type="text"
             value={kode}
             onChange={(e) => setKode(e.target.value.toUpperCase())}
             maxLength={6}
             placeholder="X X X X X X"
             disabled={isLoading}
             className="w-full text-center text-4xl tracking-[0.3em] font-mono font-black p-4 rounded-2xl border-2 border-[var(--color-surface-dark)] focus:border-[var(--color-primary)] outline-none transition-colors uppercase disabled:opacity-50"
             style={{ color: "var(--color-text)" }}
           />
        </div>

        <button 
          onClick={handleAbsen}
          disabled={isLoading || kode.length !== 6}
          className="w-full font-bold neu-button-primary py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isLoading ? <Crosshair size={20} className="animate-spin" /> : <MapPin size={20} />}
          {isLoading ? "Memproses Absen..." : "Absen Sekarang"}
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-800 text-xs font-bold shadow-sm">
         <AlertTriangle size={18} className="shrink-0 mt-0.5" />
         <p>
           Untuk dapat menggunakan fitur ini, izinkan website ini untuk mengakses lokasi perangkat / smartphone Anda saat muncul popup permintaan izin. Pastikan juga GPS di perangkat telah menyala.
         </p>
      </div>
    </div>
  );
}
