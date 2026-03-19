/* eslint-disable @next/next/no-img-element */
import { QRCodeSVG } from "qrcode.react";
import { PrintToolbar } from "@/components/print-toolbar";
import { getCertificateData } from "@/lib/app-data";
import { getBaseUrl } from "@/lib/base-url";
import { convertToArabicNumerals, translateDateToArabic, translateDufahToArabic } from "@/lib/formatters";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CetakPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getCertificateData(id);

  if (!data) {
    notFound();
  }

  if (data.status === "TIDAK_LULUS") {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-10">
        <div className="mx-auto max-w-2xl rounded-[2rem] border border-rose-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-rose-600">Syahadah Terkunci</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">Cetak Syahadah belum tersedia</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Status santri masih TIDAK_LULUS karena Tasmi&apos; atau Setoran belum terpenuhi. Silakan lengkapi data di halaman input nilai terlebih dahulu.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/admin/dashboard"
              className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Kembali ke Dashboard
            </Link>
            <Link
              href={`/admin/input-nilai/${id}`}
              className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Lengkapi Nilai
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const baseUrl = await getBaseUrl();
  const qrUrl = `${baseUrl}/ijazah/${id}`;
  const isMusyarokah = data.status === "MUSYAROKAH";
  const tanggalMulai = data.masterSantri.tanggalMulaiDufah
    ? translateDateToArabic(data.masterSantri.tanggalMulaiDufah)
    : "........";
  const tanggalSampai = data.masterSantri.tanggalSampaiDufah
    ? translateDateToArabic(data.masterSantri.tanggalSampaiDufah)
    : "........";
  const averageValue = isMusyarokah ? "" : convertToArabicNumerals(data.average.toFixed(1));
  const averagePredikat = isMusyarokah ? "" : data.averagePredikat.arab;

  return (
    <>
      <style>{`
        html, body { margin: 0; padding: 0; background: #94a3b8; }
        @media print {
          html, body { background: white !important; margin: 0 !important; padding: 0 !important; }
          @page { size: 330mm 215mm; landscape; margin: 0; }
        }
      `}</style>

      <div className="min-h-screen bg-slate-300 px-4 py-8 print:bg-white print:p-0">
        <PrintToolbar backHref="/admin/dashboard" backLabel="Kembali ke Dashboard" />

        <div className="flex items-center justify-center print:block print:min-h-0">
          <div
            style={{
              width: "330mm",
              height: "215mm",
              position: "relative",
              overflow: "hidden",
              boxShadow: "0 12px 48px rgba(0,0,0,0.35)",
              fontFamily: "'Scheherazade New', 'Amiri', serif",
              flexShrink: 0,
              background: "white",
            }}
          >
            <img
              src="/images/syahadah-bg.png"
              alt=""
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "fill",
                zIndex: 0,
                pointerEvents: "none",
                display: "block",
              }}
            />

            <div
              style={{
                position: "absolute",
                top: "70mm",
                right: "8mm",
                width: "88mm",
                zIndex: 3,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <p
                style={{
                  fontSize: "11pt",
                  color: "#000",
                  textAlign: "center",
                  marginBottom: "5mm",
                  marginTop: 0,
                  direction: "rtl",
                }}
              >
                امسح الكود للتحقق من الأصالة
              </p>
              <QRCodeSVG
                value={qrUrl}
                size={100}
                level="H"
                imageSettings={{ src: "/images/logo.png", height: 35, width: 35, excavate: true }}
              />
            </div>

            {!isMusyarokah && (
              <div
                style={{
                  position: "absolute",
                  top: "130mm",
                  right: "0mm",
                  width: "90mm",
                  zIndex: 3,
                }}
              >
                <table
                  style={{
                    width: "80%",
                    borderCollapse: "collapse",
                    fontSize: "13pt",
                    direction: "rtl",
                    border: "1px solid #000",
                  }}
                >
                  <thead>
                    <tr>
                      <th
                        colSpan={2}
                        style={{
                          padding: "1.5mm 3mm",
                          textAlign: "center",
                          fontWeight: "500",
                          color: "#000",
                          border: "1px solid #000",
                          fontSize: "15pt",
                        }}
                      >
                        حصيلة نتائج الطالب/الطالبة
                      </th>
                    </tr>
                    <tr>
                      <th
                        style={{
                          padding: "1mm 3mm",
                          textAlign: "center",
                          fontWeight: "700",
                          color: "#1a0e00",
                          border: "1.2px solid #000",
                          fontSize: "13pt",
                        }}
                      >
                        المادة
                      </th>
                      <th
                        style={{
                          padding: "1mm 2mm",
                          textAlign: "center",
                          fontWeight: "700",
                          color: "#1a0e00",
                          border: "1.2px solid #000",
                          width: "35mm",
                          fontSize: "13pt",
                        }}
                      >
                        الدرجة
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.nilaiRows.map((row) => (
                      <tr key={row.mapelId}>
                        <td
                          style={{
                            padding: "1mm 3mm",
                            textAlign: "center",
                            color: "#1a0e00",
                            border: "1px solid #000",
                            fontSize: "13pt",
                          }}
                        >
                          {row.nama_arab}
                        </td>
                        <td
                          style={{
                            padding: "1mm 2mm",
                            textAlign: "center",
                            fontWeight: "700",
                            color: "#1a0e00",
                            border: "1px solid #000",
                            fontSize: "13pt",
                          }}
                        >
                          {isMusyarokah || row.skor === null ? "" : convertToArabicNumerals(row.skor)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div
              dir="rtl"
              style={{
                position: "absolute",
                top: "72mm",
                left: "55%",
                transform: "translateX(-62%)",
                width: "175mm",
                bottom: "10mm",
                zIndex: 3,
                display: "flex",
                flexDirection: "column",
                overflow: "visible",
              }}
            >
              <div style={{ fontSize: "15pt", lineHeight: 2, color: "#1a0e00", textAlign: "justify", marginBottom: "4mm", marginTop: 0 }}>
                <p dir="rtl" style={{ textAlign: "center", marginLeft: "55px", marginTop: "27px" }}>
                  بعد الوصية بتقوى الله واتباع سنة رسول الله، قرر مركز العربية بباري كديري إندونيسيا، منح شهادة الاستكمال للطالب/الطالبة :
                </p>
              </div>

              <div style={{ textAlign: "center", marginBottom: "2mm", marginLeft: "50px" }}>
                <span
                  style={{
                    fontSize: "32pt",
                    fontWeight: "900",
                    color: "#1a6b1a",
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    letterSpacing: "0.01em",
                    lineHeight: 1,
                    display: "inline-block",
                  }}
                >
                  {data.masterSantri.nama}
                </span>
              </div>

              <p style={{ fontSize: "13pt", lineHeight: 2, color: "#1a0e00", textAlign: "justify", margin: 0, marginRight: "70px" }}>
                وذلك لإكماله/لإكمالها الدراسات والامتحانات التي أقيمت في الدفعة <strong style={{ color: "#8B1A1A" }}>{translateDufahToArabic(data.masterSantri.dufahNama)}</strong>
              </p>

              <p style={{ fontSize: "13pt", lineHeight: 2, color: "#1a0e00", textAlign: "center", margin: 0 }}>
                برنامج <strong style={{ color: "#8B1A1A", textDecoration: "underline" }}>{data.kelas.nama_arab}</strong>
              </p>

              <p style={{ fontSize: "13pt", lineHeight: 2, fontWeight: "700", textAlign: "center", margin: 0 }}>
                <span style={{ color: "#1a0e00" }}>التي تقام خلال فترات </span>
                <strong style={{ color: "#8B1A1A" }}>{tanggalMulai}</strong>
                <span style={{ color: "#8B1A1A" }}> إلى </span>
                <strong style={{ color: "#8B1A1A" }}>{tanggalSampai}</strong>
              </p>

              <p style={{ fontSize: "15pt", lineHeight: 2, color: "#1a0e00", textAlign: "center", margin: 0 }}>
                بمعدل تراكمي عام (<strong>{averageValue}</strong>)
              </p>
              <p style={{ fontSize: "15pt", lineHeight: 2, color: "#1a0e00", textAlign: "center", margin: 0 }}>
                وبتقدير <strong style={{ color: "#8B1A1A", textDecoration: "underline" }}>{averagePredikat}</strong>
              </p>
              <p style={{ fontSize: "15pt", lineHeight: 2, color: "#1a0e00", textAlign: "center", fontStyle: "italic", margin: 0 }}>
                نسأل الله أن يوفقه/يوفقها لخدمة الإسلام والعلم
              </p>

              <div style={{ marginTop: "auto", display: "flex", justifyContent: "flex-end" }}>
                <div style={{ textAlign: "center", minWidth: "55mm", position: "relative" }}>
                  <p style={{ fontSize: "15pt", color: "#1a0e00", marginBottom: "2mm", marginTop: -50, marginLeft: "-39mm" }}>
                    {data.template.jabatan_mudir_arab}
                  </p>
                  <div style={{ position: "relative", height: "19mm", marginBottom: "1mm" }}>
                    <img
                      src="/images/stamp.png"
                      alt="Stempel"
                      style={{
                        position: "absolute",
                        left: "-29mm",
                        bottom: "-13mm",
                        height: "40mm",
                        objectFit: "contain",
                        opacity: 0.88,
                        zIndex: 3,
                      }}
                    />
                    <img
                      src="/images/signature.png"
                      alt="Tanda Tangan"
                      style={{
                        position: "absolute",
                        left: "-29mm",
                        bottom: "-2mm",
                        height: "25mm",
                        objectFit: "contain",
                        zIndex: 1,
                      }}
                    />
                  </div>
                  <p style={{ fontSize: "15pt", fontWeight: "400", color: "#1a0e00", paddingTop: "1mm", margin: 0, marginLeft: "-50mm" }}>
                    {data.template.nama_mudir_arab}
                  </p>
                </div>
              </div>
            </div>

            <div
              style={{
                position: "absolute",
                bottom: "8mm",
                left: "45%",
                transform: "translateX(-50%)",
                zIndex: 4,
                direction: "rtl",
              }}
            >
              <p style={{ fontSize: "13pt", color: "#1a0e00", margin: 0, whiteSpace: "nowrap" }}>
                {data.template.tgl_cetak_arab} م
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}


