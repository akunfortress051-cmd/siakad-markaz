"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "react-hot-toast";
import { MapPin, CheckCircle, Crosshair, AlertTriangle, Navigation, Wifi, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";

type LokasiAktif = {
  id: string;
  nama: string;
  latitude: number;
  longitude: number;
  radius: number;
};

type LokasiWithDistance = LokasiAktif & {
  distance: number;
  isInRange: boolean;
};

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (n: number) => (Math.PI / 180) * n;
  const R = 6371e3;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function SantriAbsenMandiriPage() {
  const [kode, setKode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const router = useRouter();

  // GPS live tracking state
  const [lokasiAktif, setLokasiAktif] = useState<LokasiAktif[]>([]);
  const [hasSesiAktif, setHasSesiAktif] = useState<boolean | null>(null);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"loading" | "active" | "denied" | "unavailable">("loading");
  const watchRef = useRef<number | null>(null);

  // Fetch active session locations
  useEffect(() => {
    fetch("/api/santri/absen-kegiatan")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setLokasiAktif(data.lokasiAktif || []);
          setHasSesiAktif(data.hasSesiAktif);
        }
      })
      .catch(() => {});
  }, []);

  // Start GPS watch
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus("unavailable");
      return;
    }

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        setGpsStatus("active");
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setGpsStatus("denied");
        else setGpsStatus("unavailable");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
    );

    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, []);

  // Calculate distances
  const lokasiWithDistance: LokasiWithDistance[] = lokasiAktif.map(lok => {
    if (userLat === null || userLng === null) return { ...lok, distance: Infinity, isInRange: false };
    const dist = haversineDistance(userLat, userLng, lok.latitude, lok.longitude);
    return { ...lok, distance: dist, isInRange: dist <= lok.radius };
  }).sort((a, b) => a.distance - b.distance);

  const nearest = lokasiWithDistance.length > 0 ? lokasiWithDistance[0] : null;
  const anyInRange = lokasiWithDistance.some(l => l.isInRange);

  const handleAbsen = () => {
    if (!kode || kode.length !== 6) {
      toast.error("Kode harus terdiri dari 6 karakter");
      return;
    }
    if (userLat === null || userLng === null) {
      toast.error("GPS belum aktif. Izinkan akses lokasi terlebih dahulu.");
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading("Memvalidasi kode dan lokasi...");

    fetch("/api/santri/absen-kegiatan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kode, latitude: userLat, longitude: userLng })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success(data.message, { id: toastId });
          setIsSuccess(true);
          setSuccessMsg(data.message);
        } else {
          toast.error(data.detail || data.error, { id: toastId, duration: 5000 });
          setIsLoading(false);
        }
      })
      .catch(() => {
        toast.error("Terjadi kesalahan koneksi.", { id: toastId });
        setIsLoading(false);
      });
  };

  // ========== SUCCESS VIEW ==========
  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 space-y-6">
        <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center mb-2">
          <CheckCircle size={48} className="text-emerald-500 animate-pulse" />
        </div>
        <h1 className="text-2xl font-black text-center text-[var(--color-text)]">Absensi Berhasil!</h1>
        <p className="text-center font-bold text-gray-500 max-w-sm">{successMsg}</p>
        <button onClick={() => router.push("/santri/absensi")} className="neu-button-primary px-8 py-3 rounded-2xl flex items-center gap-2 mt-4 text-sm">
          Lihat Riwayat Absensi
        </button>
      </div>
    );
  }

  // ========== MAIN VIEW ==========
  return (
    <div className="space-y-5 max-w-md mx-auto mt-4 px-2">
      {/* Header */}
      <div className="flex flex-col gap-2 items-center text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-2" style={{ background: "var(--color-primary-50)" }}>
          <MapPin size={32} className="text-[var(--color-primary)]" />
        </div>
        <h1 className="text-3xl font-black text-[var(--color-text)]">Absen Mandiri</h1>
        <p className="text-sm font-semibold text-[var(--color-text-muted)] mt-1">
          Pastikan GPS menyala dan Anda berada di area kegiatan.
        </p>
      </div>

      {/* ====== LIVE LOCATION STATUS CARD ====== */}
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: anyInRange ? "#10b981" : "var(--color-surface-dark)", background: anyInRange ? "#ecfdf5" : "#fff" }}>
        {/* GPS Status Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: "var(--color-surface-dark)", background: anyInRange ? "#d1fae5" : "var(--color-surface-light)" }}>
          <div className="flex items-center gap-2">
            {gpsStatus === "active" ? (
              <Wifi size={14} className="text-emerald-600" />
            ) : (
              <WifiOff size={14} className="text-red-400" />
            )}
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: gpsStatus === "active" ? "#059669" : "#ef4444" }}>
              {gpsStatus === "active" ? "GPS Aktif" : gpsStatus === "denied" ? "GPS Ditolak" : gpsStatus === "loading" ? "Mencari Sinyal..." : "GPS Tidak Tersedia"}
            </span>
          </div>
          {gpsStatus === "active" && (
            <span className="text-[9px] text-gray-400 font-mono">
              {userLat?.toFixed(6)}, {userLng?.toFixed(6)}
            </span>
          )}
        </div>

        {/* Location Distance List */}
        {hasSesiAktif === false && (
          <div className="p-4 text-center">
            <p className="text-sm font-bold text-gray-400">Tidak ada sesi absen yang sedang aktif saat ini.</p>
          </div>
        )}

        {gpsStatus === "denied" && (
          <div className="p-4 text-center">
            <p className="text-xs font-bold text-red-500">Anda harus mengizinkan akses lokasi di browser. Buka pengaturan browser → izinkan akses lokasi untuk situs ini.</p>
          </div>
        )}

        {lokasiWithDistance.length > 0 && gpsStatus === "active" && (
          <div className="divide-y" style={{ borderColor: "var(--color-surface)" }}>
            {lokasiWithDistance.map((lok) => {
              const distText = lok.distance < 1000
                ? `${Math.round(lok.distance)} m`
                : `${(lok.distance / 1000).toFixed(1)} km`;
              
              return (
                <div key={lok.id} className="flex items-center justify-between px-4 py-3 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors"
                      style={{
                        background: lok.isInRange ? "#d1fae5" : "#fee2e2",
                      }}
                    >
                      {lok.isInRange ? (
                        <CheckCircle size={18} className="text-emerald-600" />
                      ) : (
                        <Navigation size={16} className="text-red-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: lok.isInRange ? "#059669" : "var(--color-text)" }}>
                        {lok.nama}
                      </p>
                      <p className="text-[10px] font-semibold" style={{ color: lok.isInRange ? "#10b981" : "#9ca3af" }}>
                        Radius: {lok.radius}m
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-lg font-black tabular-nums" style={{ color: lok.isInRange ? "#059669" : "#ef4444" }}>
                      {distText}
                    </span>
                    {lok.isInRange && (
                      <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider mt-0.5">✓ Dalam Jangkauan</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom banner */}
        {anyInRange && (
          <div className="bg-emerald-500 text-white py-2.5 px-4 text-center">
            <p className="text-xs font-black uppercase tracking-widest animate-pulse">
              ✓ Anda berada di area kegiatan — Silakan absen!
            </p>
          </div>
        )}
      </div>

      {/* ====== CODE INPUT & SUBMIT ====== */}
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
          disabled={isLoading || kode.length !== 6 || gpsStatus !== "active"}
          className="w-full font-bold neu-button-primary py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
        >
          {isLoading ? <Crosshair size={20} className="animate-spin" /> : <MapPin size={20} />}
          {isLoading ? "Memproses Absen..." : "Absen Sekarang"}
        </button>
      </div>

      {/* Warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-800 text-xs font-bold shadow-sm">
        <AlertTriangle size={18} className="shrink-0 mt-0.5" />
        <p>
          Izinkan akses lokasi saat popup muncul dan pastikan GPS perangkat Anda telah menyala. Jarak akan terupdate otomatis.
        </p>
      </div>
    </div>
  );
}
