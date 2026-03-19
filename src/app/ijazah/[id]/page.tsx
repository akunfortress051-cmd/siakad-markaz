/* eslint-disable @next/next/no-img-element */
import type { CSSProperties } from "react";
import { PrintToolbar } from "@/components/print-toolbar";
import { getCertificateData } from "@/lib/app-data";
import { formatDateIndo } from "@/lib/formatters";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function IjazahPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getCertificateData(id);

  if (!data) {
    notFound();
  }

  const identityRows = [
    { label: "Nama Lengkap", value: data.masterSantri.nama, bold: true },
    { label: "Gender", value: data.masterSantri.gender },
    { label: "Kelas", value: `${data.kelas.nama_indo} (${data.kelas.nama_arab})` },
    { label: "Duf'ah", value: data.masterSantri.dufahNama },
    { label: "Lokasi", value: data.lokasi },
    { label: "Status Kelulusan", value: data.status, bold: true },
  ];

  const tdLabel: CSSProperties = {
    width: "44mm",
    padding: "1mm 2mm", // Jarak atas bawah (2mm) dan kiri kanan (2mm)
    verticalAlign: "top",
    fontSize: "12pt", // Ukuran font dalam tabel
    color: "#111",
  };
  const tdColon: CSSProperties = {
    width: "5mm",
    padding: "1mm 0", // Jarak atas bawah (2mm)
    verticalAlign: "top",
    fontSize: "12pt", // Ukuran font dalam tabel
    color: "#111",
  };
  const tdValue: CSSProperties = {
    padding: "1mm 2mm", // Jarak atas bawah (2mm)
    verticalAlign: "top",
    fontSize: "12pt", // Ukuran font dalam tabel
    color: "#111",
  };

  return (
    <div
      className="min-h-screen bg-slate-300 px-4 py-10 print:bg-white print:p-0"
      style={{ fontFamily: "'Times New Roman', Times, serif" }}
    >
      <PrintToolbar backHref="/admin/dashboard" backLabel="Kembali ke Dashboard" maxWidth="210mm" />

      <div
        className="mx-auto relative overflow-hidden bg-white shadow-2xl print:shadow-none"
        style={{ width: "210mm", minHeight: "297mm" }}
      >
        <img
          src="/images/bg-border.png"
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "fill",
            zIndex: 0,
            pointerEvents: "none",
          }}
        />
        <img
          src="/images/watermark.png"
          alt=""
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "120mm",
            height: "120mm",
            objectFit: "contain",
            opacity: 0.06,
            zIndex: 1,
            pointerEvents: "none",
          }}
        />

        <div
          className="relative flex min-h-full flex-col"
          style={{ padding: "14mm 20mm 12mm 20mm", zIndex: 2, minHeight: "297mm" }}
        >
          <div className="flex flex-col items-center text-center" style={{ marginBottom: "3mm" }}>
            <img
              src="/images/logo.png"
              alt="Logo Markaz Arabiyah"
              style={{ width: "25mm", height: "25mm", objectFit: "contain", marginBottom: "2mm" }}
            />
            <p style={{ fontSize: "20pt", fontWeight: "bold", letterSpacing: "0.04em", textTransform: "uppercase", color: "#111", marginBottom: "0.5mm" }}>
              DATA PESERTA KURSUS BAHASA ARAB
            </p>
            <p style={{ fontSize: "20pt", fontWeight: "900", color: "#333", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.5mm" }}>
              &ldquo;MARKAZ ARABIYAH&rdquo;
            </p>
            <p style={{ fontSize: "15pt", fontStyle: "italic", color: "#333", marginBottom: "1mm" }}>
              (Berbasis Multiple Intelligences)
            </p>
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
              <tr><td style={tdLabel}>Program Peminatan</td><td style={tdColon}>:</td><td style={tdValue}>{data.kelas.nama_indo}</td></tr>
              <tr><td style={tdLabel}>Mulai</td><td style={tdColon}>:</td><td style={tdValue}>{data.masterSantri.tanggalMulaiDufah ? formatDateIndo(data.masterSantri.tanggalMulaiDufah) : "..."}</td></tr>
              <tr><td style={tdLabel}>Sampai</td><td style={tdColon}>:</td><td style={tdValue}>{data.masterSantri.tanggalSampaiDufah ? formatDateIndo(data.masterSantri.tanggalSampaiDufah) : "..."}</td></tr>
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
                <img
                  src="/images/stamp.png"
                  alt="Stempel"
                  style={{
                    position: "absolute",
                    left: "50%",
                    transform: "translateX(-75%)",
                    bottom: "-2mm",
                    height: "36mm",
                    objectFit: "contain",
                    opacity: 0.88,
                    zIndex: 0,
                  }}
                />
                <img
                  src="/images/signature.png"
                  alt="Tanda Tangan"
                  style={{
                    position: "absolute",
                    left: "50%",
                    transform: "translateX(-20%)",
                    bottom: "-2mm",
                    height: "28mm",
                    objectFit: "contain",
                    zIndex: 1,
                  }}
                />
              </div>
              <p style={{ fontSize: "10.5pt", fontWeight: "bold", color: "#111" }}>{data.template.nama_mudir_indo}</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body {
            background-color: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          @page {
            size: A4;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}


