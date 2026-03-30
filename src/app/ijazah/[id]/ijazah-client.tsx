"use client";

import { DocumentViewer } from "@/components/document-viewer";
import type { CSSProperties } from "react";

// A4 dalam piksel 96dpi: 794 x 1123
const DOC_W = 794;
const DOC_H = 1123;

interface IjazahClientData {
  masterSantri: { nama: string; dufahNama: string };
  santriInternal: { tempat_lahir: string; tanggal_lahir: string; alamat: string };
  program: { nama_indo: string };
  template: {
    tgl_cetak_indo: string;
    jabatan_mudir_indo: string;
    nama_mudir_indo: string;
    tgl_mulai_indo: string | null;
    tgl_selesai_indo: string | null;
  };
  nilaiRows: Array<{
    mapelId: string;
    nama_indo: string;
    skor: number | null;
  }>;
  average: number;
  averagePredikat: { indo: string };
  status: string;
}

export function IjazahClient({ data }: { data: IjazahClientData }) {
  const tdLabel: CSSProperties = {
    width: "44mm",
    padding: "1mm 2mm",
    verticalAlign: "top",
    fontSize: "12pt",
    color: "#111",
  };
  const tdColon: CSSProperties = {
    width: "5mm",
    padding: "1mm 0",
    verticalAlign: "top",
    fontSize: "12pt",
    color: "#111",
  };
  const tdValue: CSSProperties = {
    padding: "1mm 2mm",
    verticalAlign: "top",
    fontSize: "12pt",
    color: "#111",
  };

  return (
    <DocumentViewer
      backHref="/admin/dashboard"
      backLabel="Kembali ke Dashboard"
      docWidthPx={DOC_W}
      docHeightPx={DOC_H}
    >
      {/* Dokumen Ijazah dalam ukuran aslinya (796 x 1123) */}
      <div
        style={{
          width: DOC_W,
          minHeight: DOC_H,
          position: "relative",
          background: "white",
          fontFamily: "'Times New Roman', Times, serif",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        }}
      >
        {/* Background border */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/bg-border.png"
          alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "fill", zIndex: 0, pointerEvents: "none" }}
        />
        {/* Watermark */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/watermark.png"
          alt=""
          style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "120mm", height: "120mm", objectFit: "contain", opacity: 0.06, zIndex: 1, pointerEvents: "none" }}
        />

        {/* Content */}
        <div className="relative flex flex-col" style={{ padding: "14mm 20mm 12mm 20mm", zIndex: 2, minHeight: DOC_H }}>
          <div className="flex flex-col items-center text-center" style={{ marginBottom: "3mm" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo.png" alt="Logo Markaz Arabiyah" style={{ width: "25mm", height: "25mm", objectFit: "contain", marginBottom: "2mm" }} />
            <p style={{ fontSize: "20pt", fontWeight: "bold", letterSpacing: "0.04em", textTransform: "uppercase", color: "#111", marginBottom: "0.5mm" }}>
              DATA PESERTA KURSUS BAHASA ARAB
            </p>
            <p style={{ fontSize: "20pt", fontWeight: "900", color: "#333", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.5mm" }}>
              &ldquo;MARKAZ ARABIYAH&rdquo;
            </p>
            <p style={{ fontSize: "15pt", fontStyle: "italic", color: "#333", marginBottom: "1mm" }}>(Berbasis Multiple Intelligences)</p>
            <p style={{ fontSize: "20pt", textDecoration: "underline", fontWeight: "bold", color: "#111", marginBottom: "1mm" }}>
              SK. Diknas No: 421.9/4357/418.20/2022
            </p>
            <p style={{ fontSize: "10pt", color: "#222", lineHeight: 1.5, textAlign: "center" }}>
              <strong>Kantor Pusat:</strong> Jl. Cempaka, No. 32, Tegalsari, Tulungrejo, Kec. Pare, Kab. Kediri, Jawa Timur 64212.
            </p>
            <div style={{ width: "100%", borderBottom: "2px solid #C9A84C", marginTop: "3mm", marginBottom: "3mm" }} />
          </div>

          <p style={{ fontSize: "12pt", textAlign: "justify", lineHeight: 1.7, color: "#111", marginBottom: "3mm" }}>
            Menyatakan bahwa nama di bawah ini benar-benar telah mengikuti proses pembelajaran bahasa Arab di Markaz Arabiyah pada {data.masterSantri.dufahNama} yang berlaku sebagaimana terlampir.
          </p>

          <table style={{ width: "120%", borderCollapse: "collapse", border: "none" }}>
            <tbody>
              <tr><td style={tdLabel}>Nama Lengkap</td><td style={tdColon}>:</td><td style={tdValue}>{data.masterSantri.nama}</td></tr>
              <tr><td style={tdLabel}>Tempat, Tanggal Lahir</td><td style={tdColon}>:</td><td style={tdValue}>{data.santriInternal.tempat_lahir}, {data.santriInternal.tanggal_lahir}</td></tr>
              <tr><td style={tdLabel}>Alamat</td><td style={tdColon}>:</td><td style={tdValue}>{data.santriInternal.alamat}</td></tr>
              <tr><td style={tdLabel}>Program Peminatan</td><td style={tdColon}>:</td><td style={tdValue}>{data.program.nama_indo}</td></tr>
              <tr><td style={tdLabel}>Mulai</td><td style={tdColon}>:</td><td style={tdValue}>{data.template.tgl_mulai_indo || "..."}</td></tr>
              <tr><td style={tdLabel}>Sampai</td><td style={tdColon}>:</td><td style={tdValue}>{data.template.tgl_selesai_indo || "..."}</td></tr>
            </tbody>
          </table>

          {data.status !== "MUSYAROKAH" && (
            <div style={{ marginTop: "4mm" }}>
              <p style={{ fontWeight: "bold", fontSize: "12pt", color: "#111", marginBottom: "1mm" }}>Dengan rincian nilai sebagai berikut:</p>
              <table style={{ width: "100%", borderCollapse: "collapse", border: "none" }}>
                <tbody>
                  {data.nilaiRows.map((row) => (
                    <tr key={row.mapelId}>
                      <td style={{ ...tdLabel, borderRight: "none" }}>{row.nama_indo}</td>
                      <td style={{ ...tdColon, borderRight: "none" }}>:</td>
                      <td style={tdValue}>{row.skor ?? "-"}</td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ ...tdLabel, borderRight: "none" }}>Nilai Akumulatif</td>
                    <td style={{ ...tdColon, borderRight: "none" }}>:</td>
                    <td style={tdValue}>{data.average.toFixed(1)}</td>
                  </tr>
                  <tr>
                    <td style={{ ...tdLabel, borderRight: "none" }}>Predikat</td>
                    <td style={{ ...tdColon, borderRight: "none" }}>:</td>
                    <td style={tdValue}>{data.averagePredikat.indo}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <p style={{ fontSize: "12pt", textAlign: "justify", lineHeight: 1.7, color: "#111", marginTop: "4mm" }}>
            Demikian surat keterangan ini dibuat agar dapat dipergunakan sebagaimana mestinya dan menjadi bukti hasil evaluasi santri dalam program pembelajaran bahasa Arab di Markaz Arabiyah.
          </p>

          <div style={{ marginTop: "auto", paddingTop: "5mm", display: "flex", justifyContent: "flex-end", alignItems: "flex-end" }}>
            <div style={{ textAlign: "center", minWidth: "90mm", position: "relative" }}>
              <p style={{ fontSize: "11pt", color: "#111", marginBottom: "1mm" }}>Pare, {data.template.tgl_cetak_indo}</p>
              <p style={{ fontSize: "11pt", color: "#111", marginBottom: "2mm" }}>{data.template.jabatan_mudir_indo}</p>
              <div style={{ position: "relative", height: "35mm", marginBottom: "2mm", display: "flex", justifyContent: "center" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/stamp.png" alt="Stempel" style={{ position: "absolute", left: "50%", transform: "translateX(-75%)", bottom: "-2mm", height: "36mm", objectFit: "contain", opacity: 0.88, zIndex: 0 }} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/signature.png" alt="Tanda Tangan" style={{ position: "absolute", left: "50%", transform: "translateX(-20%)", bottom: "-2mm", height: "28mm", objectFit: "contain", zIndex: 1 }} />
              </div>
              <p style={{ fontSize: "10.5pt", fontWeight: "bold", color: "#111" }}>{data.template.nama_mudir_indo}</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body { background-color: white !important; margin: 0 !important; padding: 0 !important; }
          @page { size: A4; margin: 0; }
        }
      `}</style>
    </DocumentViewer>
  );
}
