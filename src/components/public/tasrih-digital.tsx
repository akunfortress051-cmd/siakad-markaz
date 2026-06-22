"use client";

import { useRef, useEffect } from "react";
import QRCode from "react-qr-code";
import html2canvas from "html2canvas";
import { Download, AlertTriangle, CheckCircle, Clock } from "lucide-react";

type Santri = {
  nama: string;
  kelas: { nama: string } | null;
};

type Record = {
  id: string;
  sakan?: string;
  riwayat: { santri: Santri; kelas: { nama: string } | null };
};

type TasrihData = {
  grupId: string;
  tipeIzin: string;
  statusIzin: string;
  alasan: string;
  tanggalMulai: string;
  tanggalSelesai: string | null;
  batasJamAkhir: string | null;
  nomorTasrih: string;
  createdAt: string;
  records: Record[];
};

export default function TasrihDigital({ data, autoDownload = false }: { data: TasrihData, autoDownload?: boolean }) {
  const tasrihRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoDownload) {
      // Tunggu render selesai baru download
      const timer = setTimeout(() => {
        handleDownload();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [autoDownload, data.grupId]);

  const handleDownload = async () => {
    if (!tasrihRef.current) return;
    try {
      const canvas = await html2canvas(tasrihRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        // Clone callback to fix lab() color issue from Tailwind v4
        onclone: (doc: Document) => {
          const el = doc.querySelector('[data-tasrih-card]') as HTMLElement;
          if (el) {
            el.style.fontFamily = 'system-ui, -apple-system, sans-serif';
          }
        }
      });
      const link = document.createElement("a");
      link.download = `Tasrih-${data.nomorTasrih}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Gagal mendownload tasrih", err);
    }
  };

  const getStatusDisplay = () => {
    switch (data.statusIzin) {
      case "AKTIF": return { label: "Disetujui", textColor: "#16a34a", bgColor: "#f0fdf4", borderColor: "#bbf7d0", icon: <CheckCircle size={20} /> };
      case "MENUNGGU": return { label: "Menunggu Persetujuan", textColor: "#ca8a04", bgColor: "#fefce8", borderColor: "#fef08a", icon: <Clock size={20} /> };
      case "DITOLAK": return { label: "Ditolak", textColor: "#dc2626", bgColor: "#fef2f2", borderColor: "#fecaca", icon: <AlertTriangle size={20} /> };
      case "SUDAH_KEMBALI": return { label: "Sudah Kembali", textColor: "#059669", bgColor: "#ecfdf5", borderColor: "#a7f3d0", icon: <CheckCircle size={20} /> };
      default: return { label: "Selesai", textColor: "#475569", bgColor: "#f8fafc", borderColor: "#e2e8f0", icon: <CheckCircle size={20} /> };
    }
  };

  const status = getStatusDisplay();
  const verifyUrl = typeof window !== 'undefined' ? `${window.location.origin}/perizinan/tasrih/${data.grupId}` : "";

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* Container untuk didownload */}
      <div 
        ref={tasrihRef}
        data-tasrih-card
        style={{ backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", overflow: "hidden", position: "relative" }}
      >
        <div style={{ padding: "24px", borderBottom: "2px dashed #e2e8f0", textAlign: "center", backgroundColor: "#eff6ff" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
            <div style={{ width: "64px", height: "4px", backgroundColor: "#2563eb", borderRadius: "9999px" }}></div>
          </div>
          <h3 style={{ fontWeight: 900, fontSize: "20px", letterSpacing: "-0.025em", color: "#1e3a5f", textTransform: "uppercase" as const }}>
            TASRIH DIGITAL
          </h3>
          <p style={{ fontSize: "14px", fontWeight: 700, color: "#2563eb", marginTop: "2px", textTransform: "uppercase" as const, letterSpacing: "0.1em" }}>
            (IZIN {data.tipeIzin.replace("_", " ")})
          </p>
          <p style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", fontFamily: "monospace", marginTop: "8px", borderTop: "2px dashed #bfdbfe", paddingTop: "8px" }}>
            {data.nomorTasrih}
          </p>
        </div>

        <div style={{ padding: "24px", display: "flex", flexDirection: "column" as const, gap: "16px", fontSize: "14px", backgroundColor: "#ffffff" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px", borderRadius: "12px", border: `1px solid ${status.borderColor}`, backgroundColor: status.bgColor, color: status.textColor, fontWeight: 700, justifyContent: "center" }}>
            {status.icon}
            {status.label}
          </div>

          <div style={{ display: "flex", justifyContent: "center", padding: "8px 0" }}>
            <div style={{ padding: "8px", backgroundColor: "#ffffff", borderRadius: "12px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9" }}>
              <QRCode value={verifyUrl} size={120} level="M" />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" as const, gap: "12px" }}>
            <div>
              <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 700, display: "block", marginBottom: "4px" }}>Tanggal Izin</span>
              <span style={{ fontWeight: 700, color: "#0f172a", display: "block", backgroundColor: "#f8fafc", padding: "8px", borderRadius: "8px", border: "1px solid #f1f5f9" }}>
                {new Date(data.tanggalMulai).toLocaleDateString("id-ID", { dateStyle: "long" })}
                {data.tanggalSelesai && ` - ${new Date(data.tanggalSelesai).toLocaleDateString("id-ID", { dateStyle: "long" })}`}
              </span>
            </div>

            {data.tipeIzin === "KELUAR_PARE" && data.batasJamAkhir && (
              <div>
                <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 700, display: "block", marginBottom: "4px" }}>Batas Waktu Kembali</span>
                <span style={{ fontWeight: 700, color: "#854d0e", display: "block", backgroundColor: "#fefce8", padding: "8px", borderRadius: "8px", border: "1px solid #fef08a" }}>
                  {data.batasJamAkhir} WIB
                </span>
              </div>
            )}

            <div>
              <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 700, display: "block", marginBottom: "4px" }}>Alasan</span>
              <span style={{ fontWeight: 700, color: "#0f172a", display: "block", backgroundColor: "#f8fafc", padding: "8px", borderRadius: "8px", border: "1px solid #f1f5f9" }}>
                {data.alasan}
              </span>
            </div>
            
            <div>
              <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 700, display: "block", marginBottom: "8px" }}>Daftar Santri ({data.records.length})</span>
              <div style={{ maxHeight: "160px", overflowY: "auto" as const, backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #f1f5f9", padding: "8px", display: "flex", flexDirection: "column" as const, gap: "8px" }}>
                {data.records.map(r => (
                  <div key={r.id} style={{ backgroundColor: "#ffffff", padding: "8px", borderRadius: "4px", border: "1px solid #f1f5f9", display: "flex", flexDirection: "column" as const }}>
                    <span style={{ fontWeight: 700, color: "#0f172a", fontSize: "12px" }}>{r.riwayat.santri.nama}</span>
                    <span style={{ fontSize: "10px", color: "#64748b" }}>
                      {r.riwayat.kelas?.nama || "Tanpa Kelas"}
                      {r.sakan && r.sakan !== "-" ? ` • Sakan: ${r.sakan}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <button 
        onClick={handleDownload}
        className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm"
      >
        <Download size={18} />
        Download Tasrih (PNG)
      </button>
    </div>
  );
}
