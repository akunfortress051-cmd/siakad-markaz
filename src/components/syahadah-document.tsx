import { QRCodeSVG } from "qrcode.react";
import { convertToArabicNumerals } from "@/lib/formatters";
import { translateDufahToArabic } from "@/lib/formatters";

// Define a minimal required type derived from getCertificateData
type SyahadahDocumentProps = {
  qrUrl: string;
  data: {
    status: string;
    average: number;
    averagePredikat: { indo: string; arab: string };
    masterSantri: {
      nama: string;
      dufahNama: string;
    };
    program: {
      nama_arab: string;
    };
    template: {
      tgl_cetak_arab: string;
      tgl_mulai_arab: string | null;
      tgl_selesai_arab: string | null;
      jabatan_mudir_arab: string;
      nama_mudir_arab: string;
    };
    nilaiRows: Array<{
      mapelId: string;
      nama_arab: string;
      skor: number | null;
    }>;
  };
};

export function SyahadahDocument({ qrUrl, data }: SyahadahDocumentProps) {
  const isMusyarokah = data.status === "MUSYAROKAH";
  const tanggalMulai = data.template.tgl_mulai_arab || "........";
  const tanggalSampai = data.template.tgl_selesai_arab || "........";
  const averageValue = isMusyarokah ? "" : convertToArabicNumerals(data.average.toFixed(1));
  const averagePredikat = isMusyarokah ? "" : data.averagePredikat.arab;

  return (
    <div className="container-syahadah flex items-center justify-center print:block print:min-h-0" style={{ pageBreakAfter: "always" }}>
      <div
        className="doc-syahadah"
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
            <p dir="rtl" style={{ textAlign: "center", marginLeft: "100px", marginTop: "27px" }}>
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
            برنامج <strong style={{ color: "#8B1A1A", textDecoration: "underline" }}>{data.program.nama_arab}</strong>
          </p>

          <p style={{ fontSize: "13pt", lineHeight: 2, fontWeight: "700", textAlign: "center", margin: 0 }}>
            <span style={{ color: "#1a0e00" }}>التي تقام خلال فترات </span>
            <strong style={{ color: "#8B1A1A" }}>{tanggalMulai}</strong>
            <span style={{ color: "#8B1A1A" }}> إلى </span>
            <strong style={{ color: "#8B1A1A" }}>{tanggalSampai}</strong>
          </p>

          {!isMusyarokah && (
            <>
              <p style={{ fontSize: "15pt", lineHeight: 2, color: "#1a0e00", textAlign: "center", margin: 0 }}>
                بمعدل تراكمي عام (<strong>{averageValue}</strong>)
              </p>
              <p style={{ fontSize: "15pt", lineHeight: 2, color: "#1a0e00", textAlign: "center", margin: 0 }}>
                وبتقدير <strong style={{ color: "#8B1A1A", textDecoration: "underline" }}>{averagePredikat}</strong>
              </p>
            </>
          )}

          <p style={{ fontSize: "15pt", lineHeight: 2, color: "#1a0e00", textAlign: "center", margin: 0 }}>
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
  );
}
