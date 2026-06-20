"use client";

import { DocumentViewer } from "@/components/document-viewer";
import type { CSSProperties } from "react";
import { getPredikat } from "@/lib/formatters";

// A4 dalam piksel 96dpi: 794 x 1123
const DOC_W = 794;
const DOC_H = 1123;

interface VerifikasiClientData {
  nama: string;
  program_indo: string;
  periodeAwal: string;
  periodeAkhir: string;
  nilai: number | null;
  isMusyarokah: boolean;
  template: {
    tgl_cetak_indo: string;
    jabatan_mudir_indo: string;
    nama_mudir_indo: string;
  };
}

export function VerifikasiClient({ data }: { data: VerifikasiClientData }) {
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

  const predikat = data.nilai !== null ? getPredikat(Math.round(data.nilai)).indo : "-";

  return (
    <DocumentViewer
      backHref="/"
      backLabel="Kembali ke Beranda"
      docWidthPx={DOC_W}
      docHeightPx={DOC_H}
    >
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
        <img
          src="/images/bg-border.png"
          alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "fill", zIndex: 0, pointerEvents: "none" }}
        />
        {/* Watermark */}
        <img
          src="/images/watermark.png"
          alt=""
          style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "120mm", height: "120mm", objectFit: "contain", opacity: 0.06, zIndex: 1, pointerEvents: "none" }}
        />

        {/* Content */}
        <div className="relative flex flex-col" style={{ padding: "14mm 20mm 12mm 20mm", zIndex: 2, minHeight: DOC_H }}>
          <div className="flex flex-col items-center text-center" style={{ marginBottom: "3mm" }}>
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
            Menyatakan bahwa nama di bawah ini benar-benar telah mengikuti proses pembelajaran bahasa Arab program online di Markaz Arabiyah yang berlaku sebagaimana terlampir.
          </p>

          <table style={{ width: "120%", borderCollapse: "collapse", border: "none" }}>
            <tbody>
              <tr><td style={tdLabel}>Nama Lengkap</td><td style={tdColon}>:</td><td style={tdValue}>{data.nama}</td></tr>
              <tr><td style={tdLabel}>Program Peminatan</td><td style={tdColon}>:</td><td style={tdValue}>{data.program_indo}</td></tr>
              <tr><td style={tdLabel}>Periode</td><td style={tdColon}>:</td><td style={tdValue}>{data.periodeAwal} - {data.periodeAkhir}</td></tr>
            </tbody>
          </table>

          {!data.isMusyarokah && (
            <div style={{ marginTop: "4mm" }}>
              <p style={{ fontWeight: "bold", fontSize: "12pt", color: "#111", marginBottom: "1mm" }}>Dengan rincian nilai sebagai berikut:</p>
              <table style={{ width: "100%", borderCollapse: "collapse", border: "none" }}>
                <tbody>
                  <tr>
                    <td style={{ ...tdLabel, borderRight: "none" }}>Nilai Akumulatif</td>
                    <td style={{ ...tdColon, borderRight: "none" }}>:</td>
                    <td style={tdValue}>{data.nilai !== null ? Math.round(data.nilai) : "-"}</td>
                  </tr>
                  <tr>
                    <td style={{ ...tdLabel, borderRight: "none" }}>Predikat</td>
                    <td style={{ ...tdColon, borderRight: "none" }}>:</td>
                    <td style={tdValue}>{predikat}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <p style={{ fontSize: "12pt", textAlign: "justify", lineHeight: 1.7, color: "#111", marginTop: "4mm" }}>
            Demikian surat keterangan ini dibuat agar dapat dipergunakan sebagaimana mestinya dan menjadi bukti hasil evaluasi santri dalam program pembelajaran bahasa Arab online di Markaz Arabiyah.
          </p>

          <div style={{ marginTop: "auto", paddingTop: "5mm", display: "flex", justifyContent: "flex-end", alignItems: "flex-end" }}>
            <div style={{ textAlign: "center", minWidth: "90mm", position: "relative" }}>
              <p style={{ fontSize: "11pt", color: "#111", marginBottom: "1mm" }}>Pare, {data.template.tgl_cetak_indo}</p>
              <p style={{ fontSize: "11pt", color: "#111", marginBottom: "2mm" }}>{data.template.jabatan_mudir_indo}</p>
              <div style={{ position: "relative", height: "35mm", marginBottom: "2mm", display: "flex", justifyContent: "center" }}>
                <img src="/images/stamp.png" alt="Stempel" style={{ position: "absolute", left: "50%", transform: "translateX(-75%)", bottom: "-2mm", height: "36mm", objectFit: "contain", opacity: 0.88, zIndex: 0 }} />
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
