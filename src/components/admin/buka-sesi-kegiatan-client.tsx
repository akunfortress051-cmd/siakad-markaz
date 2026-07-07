"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { RotateCcw, Power, PowerOff, QrCode } from "lucide-react";

type Kategori = { id: string; nama: string };
type Lokasi = { id: string; nama: string };
type Sesi = {
  id: string;
  kode: string;
  durasiMenit: number;
  dibukaPada: string;
  ditutupPada: string;
  isClosed: boolean;
  kategori: Kategori;
  lokasiList: { lokasi: Lokasi }[];
};

export function BukaSesiKegiatanClient({ kegiatanList, lokasiList }: { kegiatanList: Kategori[], lokasiList: Lokasi[] }) {
  const [selectedKategori, setSelectedKategori] = useState(kegiatanList[0]?.id || "");
  const [selectedLokasi, setSelectedLokasi] = useState<string[]>([]);
  const [durasi, setDurasi] = useState<number>(30);
  const [isOpening, setIsOpening] = useState(false);
  const [sesiAktif, setSesiAktif] = useState<Sesi[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSesi = async () => {
    try {
      const res = await fetch("/api/admin/absensi/sesi-kegiatan");
      const data = await res.json();
      if (Array.isArray(data)) setSesiAktif(data);
    } catch {
      toast.error("Gagal memuat sesi aktif");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSesi();
    const interval = setInterval(fetchSesi, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, []);

  const handleToggleLokasi = (id: string) => {
    setSelectedLokasi(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleBukaSesi = async () => {
    if (!selectedKategori || selectedLokasi.length === 0 || durasi < 1) {
      toast.error("Lengkapi data kategori dan minimal 1 lokasi");
      return;
    }
    if (!confirm("Buka sesi absensi mandiri kegiatan ini?")) return;

    setIsOpening(true);
    try {
      const res = await fetch("/api/admin/absensi/sesi-kegiatan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kategoriId: selectedKategori,
          lokasiIds: selectedLokasi,
          durasiMenit: durasi
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Sesi berhasil dibuka!");
        setSelectedLokasi([]);
        fetchSesi();
      } else {
        toast.error(data.error || "Gagal membuka sesi");
      }
    } catch {
      toast.error("Terjadi kesalahan sistem");
    } finally {
      setIsOpening(false);
    }
  };

  const handleTutupSesi = async (id: string, kode: string) => {
    if (!confirm(`Tutup sesi ${kode} sekarang? Santri yang belum absen akan otomatis ALPHA (kecuali izin tasrih).`)) return;

    try {
      const toastId = toast.loading("Menutup sesi dan memproses rekap...");
      const res = await fetch(`/api/admin/absensi/sesi-kegiatan/${id}`, { method: "PATCH" });
      const data = await res.json();
      toast.dismiss(toastId);
      if (data.success) {
        toast.success(`Sesi ditutup! ${data.totalAutoFilled} santri di-auto ALPHA/IZIN.`);
        fetchSesi();
      } else {
        toast.error(data.error || "Gagal menutup sesi");
      }
    } catch {
      toast.error("Terjadi kesalahan sistem");
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Kolom Kiri: Form Buka Sesi */}
      <div className="flex flex-col gap-5 neu-card-white p-6">
        <h2 className="font-black text-lg text-emerald-600 mb-2 border-b pb-2">Buka Sesi Absen Baru</h2>
        
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Kegiatan</label>
          <select value={selectedKategori} onChange={(e) => setSelectedKategori(e.target.value)} className="neu-input w-full p-2.5 text-sm font-bold">
            {kegiatanList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Durasi Sesi</label>
          <div className="flex items-center gap-3">
             <input type="number" min="1" max="1440" value={durasi} onChange={(e) => setDurasi(parseInt(e.target.value))} className="neu-input w-24 p-2 text-center font-bold text-lg text-emerald-600" />
             <span className="text-sm font-bold text-gray-500">Menit</span>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Pilih Lokasi Diizinkan</label>
          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-2">
            {lokasiList.map(lok => (
              <label key={lok.id} className="flex items-center gap-3 p-3 rounded-xl border-2 hover:bg-emerald-50 cursor-pointer transition-colors" style={{ borderColor: selectedLokasi.includes(lok.id) ? "var(--color-primary)" : "var(--color-surface-dark)" }}>
                <input type="checkbox" checked={selectedLokasi.includes(lok.id)} onChange={() => handleToggleLokasi(lok.id)} className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500" />
                <span className="text-sm font-bold text-gray-700">{lok.nama}</span>
              </label>
            ))}
            {lokasiList.length === 0 && <span className="text-xs text-red-500 font-bold">Belum ada lokasi aktif. Silakan atur di Pengaturan.</span>}
          </div>
        </div>

        <button onClick={handleBukaSesi} disabled={isOpening || selectedLokasi.length === 0} className="neu-button-primary w-full py-4 rounded-2xl flex justify-center items-center gap-2 mt-4 text-sm disabled:opacity-50">
          <Power size={18} /> {isOpening ? "Memproses..." : "Buka Sesi Absensi Sekarang"}
        </button>
      </div>

      {/* Kolom Kanan: Sesi Aktif & History */}
      <div className="md:col-span-2 flex flex-col gap-4 neu-card-white p-6 bg-gray-50">
         <div className="flex justify-between items-center mb-4">
            <h2 className="font-black text-lg text-gray-800">Daftar Sesi (Hari Ini)</h2>
            <button onClick={fetchSesi} className="neu-button p-2 text-gray-500 hover:text-emerald-600"><RotateCcw size={16}/></button>
         </div>

         {isLoading ? (
           <div className="text-center p-8 text-gray-400 font-bold animate-pulse">Memuat data sesi...</div>
         ) : sesiAktif.length === 0 ? (
           <div className="text-center p-8 text-gray-300 font-bold text-sm">Tidak ada sesi absen mandiri hari ini.</div>
         ) : (
           <div className="flex flex-col gap-4 max-h-[600px] overflow-y-auto pr-2">
              {sesiAktif.map(sesi => {
                 const isClosed = sesi.isClosed || new Date(sesi.ditutupPada) <= new Date();
                 return (
                   <div key={sesi.id} className={`rounded-2xl p-5 border-l-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 ${isClosed ? 'bg-gray-100 border-gray-300' : 'bg-white border-emerald-500'}`}>
                      <div>
                         <div className="flex items-center gap-2 mb-2">
                           <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${isClosed ? 'bg-gray-200 text-gray-500' : 'bg-emerald-100 text-emerald-700 animate-pulse'}`}>{isClosed ? 'Selesai / Ditutup' : 'AKTIF BERJALAN'}</span>
                         </div>
                         <h3 className="font-black text-lg text-gray-800">{sesi.kategori.nama}</h3>
                         <p className="text-xs text-gray-500 mt-1 font-semibold flex items-center gap-1">Pilihan Lokasi: {sesi.lokasiList.map(l => l.lokasi.nama).join(', ')}</p>
                      </div>
                      
                      <div className="flex items-center gap-6">
                         <div className="text-center">
                            <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">KODE AKSES</span>
                            <div className="bg-gray-800 text-white font-mono font-bold text-2xl tracking-[0.2em] px-4 py-2 rounded-xl flex items-center justify-center border-b-4 border-gray-900 select-all">
                               {sesi.kode}
                            </div>
                         </div>
                         
                         {!isClosed && (
                           <button onClick={() => handleTutupSesi(sesi.id, sesi.kode)} className="flex items-center justify-center p-3 rounded-xl bg-red-100 text-red-600 hover:bg-red-500 hover:text-white transition-all border border-red-200">
                             <PowerOff size={20} />
                           </button>
                         )}
                      </div>
                   </div>
                 )
              })}
           </div>
         )}
      </div>
    </div>
  )
}
