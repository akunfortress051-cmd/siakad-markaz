"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { Armchair, ListOrdered, Printer, Loader2 } from "lucide-react";

type SantriRow = {
  id: string;
  nama: string;
  gender: string;
  programNama: string;
  programId: string | null;
  kelasNama: string;
  kelasId: string | null;
  statusKelulusan: string;
  average: number;
  averagePredikat: { indo: string; arab: string };
  isAktif: boolean;
  canViewIjazah: boolean;
  isMartabahUla?: boolean;
};

type KelasItem = {
  id: string;
  nama: string;
  programId: string;
  waliKelas?: {
    nama: string;
  } | null;
};

const PROGRAM_ORDER = [
  "Shifr", "I'dad Awal", "I'dad Tsani",
  "Syarqi Awwal", "Syarqi Tsany", "Atiqah",
  "Takhasus Awal", "Takhasus Tsani", "Akbarnas"
];

function getProgramOrder(programNama: string) {
  const idx = PROGRAM_ORDER.findIndex(p => programNama.toLowerCase().includes(p.toLowerCase()));
  return idx === -1 ? 99 : idx;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

function padAndReverse(chunk: any[], size: number) {
  const padded = [...chunk];
  while (padded.length < size) {
    padded.push(null);
  }
  return padded.reverse();
}

export function HaflahWadaClient({
  santriRows,
  kelasList,
  dufahLabel
}: {
  santriRows: SantriRow[];
  kelasList: KelasItem[];
  dufahLabel: string;
}) {
  const [activeTab, setActiveTab] = useState<"denah" | "pemanggilan">("denah");
  const [mounted, setMounted] = useState(false);
  const [exporting, setExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const processedSantri = useMemo(() => {
    const topByProgram = new Map<string, string>();
    const programGroups = new Map<string, SantriRow[]>();
    
    santriRows.forEach(s => {
      const pId = s.programId || "unknown_program";
      if (!programGroups.has(pId)) programGroups.set(pId, []);
      programGroups.get(pId)!.push(s);
    });

    programGroups.forEach((students) => {
      students.sort((a, b) => b.average - a.average);
      if (students.length > 0) {
        topByProgram.set(students[0].programId || "unknown_program", students[0].id);
      }
    });

    let mapped = santriRows.map(s => ({
      ...s,
      isMartabahUla: topByProgram.get(s.programId || "unknown_program") === s.id
    }));

    mapped.sort((a, b) => {
      const pA = getProgramOrder(a.programNama);
      const pB = getProgramOrder(b.programNama);
      if (pA !== pB) return pA - pB;
      
      const kA = a.kelasNama.localeCompare(b.kelasNama, "id");
      if (kA !== 0) return kA;
      
      const statA = a.statusKelulusan === "MUSYAROKAH" ? 1 : 0;
      const statB = b.statusKelulusan === "MUSYAROKAH" ? 1 : 0;
      if (statA !== statB) return statA - statB;
      
      return b.average - a.average;
    });

    return mapped;
  }, [santriRows]);

  const denahBanin = useMemo(() => processedSantri.filter(s => s.gender === "BANIN"), [processedSantri]);
  const denahBanat = useMemo(() => processedSantri.filter(s => s.gender === "BANAT"), [processedSantri]);

  const kelasMap = useMemo(() => {
    const map = new Map<string, KelasItem>();
    kelasList.forEach(k => map.set(k.id, k));
    return map;
  }, [kelasList]);

  const pemanggilanGroups = useMemo(() => {
    const groups = new Map<string, SantriRow[]>();
    processedSantri.forEach(s => {
      const kId = s.kelasId || "unknown_kelas";
      if (!groups.has(kId)) groups.set(kId, []);
      groups.get(kId)!.push(s);
    });

    const sortedClassIds = Array.from(groups.keys()).sort((a, b) => {
      const classA = kelasMap.get(a);
      const classB = kelasMap.get(b);
      const programA = processedSantri.find(s => s.kelasId === a)?.programNama || "";
      const programB = processedSantri.find(s => s.kelasId === b)?.programNama || "";
      
      const pA = getProgramOrder(programA);
      const pB = getProgramOrder(programB);
      if (pA !== pB) return pA - pB;
      
      return (classA?.nama || "").localeCompare(classB?.nama || "", "id");
    });

    return sortedClassIds.map(classId => {
      const students = groups.get(classId)!;
      return {
        kelas: kelasMap.get(classId),
        banin: students.filter(s => s.gender === "BANIN"),
        banat: students.filter(s => s.gender === "BANAT")
      };
    });
  }, [processedSantri, kelasMap]);

  const handleExportPDF = useCallback(async () => {
    if (!printRef.current || exporting) return;
    setExporting(true);

    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const isLandscape = activeTab === "denah";
      const f4Width = isLandscape ? 330.2 : 215.9;
      const f4Height = isLandscape ? 215.9 : 330.2;
      const orientation = isLandscape ? "landscape" : "portrait";
      const winWidth = isLandscape ? 1200 : 800; // Narrower window for portrait brings columns closer
      const margin = 10;
      const usableWidth = f4Width - margin * 2;
      const usableHeight = f4Height - margin * 2;

      const pdf = new jsPDF({ orientation: orientation as "landscape" | "portrait", unit: "mm", format: [215.9, 330.2] });

      const oncloneHandler = (clonedDoc: Document) => {
        clonedDoc.querySelectorAll('link[rel="stylesheet"], style').forEach(el => el.remove());
        const resetStyle = clonedDoc.createElement("style");
        resetStyle.textContent = `* { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; box-sizing: border-box; }`;
        clonedDoc.head.appendChild(resetStyle);
      };

      // Find all sections
      const sections = printRef.current.querySelectorAll("[data-pdf-section]");

      if (sections.length === 0) {
        // Fallback: render the whole thing
        const canvas = await html2canvas(printRef.current, { scale: 2, useCORS: true, logging: false, backgroundColor: "#ffffff", windowWidth: winWidth, onclone: oncloneHandler });
        const ratio = usableWidth / canvas.width;
        const scaledH = canvas.height * ratio;
        if (scaledH <= usableHeight) {
          pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", margin, margin, usableWidth, scaledH);
        } else {
          let srcY = 0; let remaining = canvas.height; let page = 0;
          while (remaining > 0) {
            if (page > 0) pdf.addPage([215.9, 330.2], orientation as "landscape" | "portrait");
            const slice = Math.min(remaining, usableHeight / ratio);
            const sc = document.createElement("canvas"); sc.width = canvas.width; sc.height = slice;
            sc.getContext("2d")!.drawImage(canvas, 0, srcY, canvas.width, slice, 0, 0, canvas.width, slice);
            pdf.addImage(sc.toDataURL("image/jpeg", 0.95), "JPEG", margin, margin, usableWidth, slice * ratio);
            srcY += slice; remaining -= slice; page++;
          }
        }
      } else {
        // Render each section, placing on pages with smart breaks
        let currentY = margin;
        let pageNum = 0;

        for (let i = 0; i < sections.length; i++) {
          const section = sections[i] as HTMLElement;
          const canvas = await html2canvas(section, {
            scale: 2, useCORS: true, logging: false, backgroundColor: "#ffffff", windowWidth: winWidth, onclone: oncloneHandler
          });

          const ratio = usableWidth / canvas.width;
          const scaledH = canvas.height * ratio;

          // If this section doesn't fit on the current page, start a new page
          if (currentY + scaledH > f4Height - margin && currentY > margin + 1) {
            pdf.addPage([215.9, 330.2], orientation as "landscape" | "portrait");
            pageNum++;
            currentY = margin;
          }

          // If section is taller than one full page, slice at row boundaries
          if (scaledH > usableHeight) {
            // Find row boundaries for clean cuts (never cut through a row)
            const sectionRect = section.getBoundingClientRect();
            const rowBottoms: number[] = [];
            section.querySelectorAll("tr").forEach((el) => {
              const elRect = el.getBoundingClientRect();
              const fracBottom = (elRect.bottom - sectionRect.top) / sectionRect.height;
              rowBottoms.push(Math.round(fracBottom * canvas.height));
            });
            // Also add header elements (divs before tables)
            section.querySelectorAll(":scope > div, :scope > table").forEach((el) => {
              const elRect = el.getBoundingClientRect();
              const fracBottom = (elRect.bottom - sectionRect.top) / sectionRect.height;
              rowBottoms.push(Math.round(fracBottom * canvas.height));
            });
            rowBottoms.sort((a, b) => a - b);

            const maxSliceHeight = usableHeight / ratio;
            let srcY = 0;

            while (srcY < canvas.height - 2) {
              if (srcY > 0) { pdf.addPage([215.9, 330.2], orientation as "landscape" | "portrait"); pageNum++; currentY = margin; }

              let cutY = Math.min(srcY + maxSliceHeight, canvas.height);

              // Find the last row boundary that fits within the page
              if (rowBottoms.length > 0) {
                let bestCut = -1;
                for (const rb of rowBottoms) {
                  if (rb > srcY + 2 && rb <= srcY + maxSliceHeight) {
                    bestCut = rb;
                  }
                }
                if (bestCut > srcY + 2) {
                  cutY = bestCut;
                }
              }

              const sliceH = Math.ceil(Math.min(cutY - srcY, canvas.height - srcY));
              if (sliceH <= 0) break;

              const sc = document.createElement("canvas");
              sc.width = canvas.width;
              sc.height = sliceH;
              sc.getContext("2d")!.drawImage(canvas, 0, srcY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
              pdf.addImage(sc.toDataURL("image/jpeg", 0.95), "JPEG", margin, currentY, usableWidth, sliceH * ratio);
              currentY += sliceH * ratio;
              srcY += sliceH;
            }
          } else {
            pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", margin, currentY, usableWidth, scaledH);
            currentY += scaledH + 4; // 4mm gap between sections
          }
        }
      }

      const filename = activeTab === "denah"
        ? `Denah_Haflah_Wada_${dufahLabel.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`
        : `Pemanggilan_Haflah_Wada_${dufahLabel.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;

      pdf.save(filename);
    } catch (err) {
      console.error("Export PDF failed:", err);
      alert("Gagal export PDF. Silakan coba lagi.");
    } finally {
      setExporting(false);
    }
  }, [activeTab, exporting, dufahLabel]);

  if (!mounted) return null;

  // Render a cell for denah grid — with seat number
  const renderDenahCell = (student: any, colIdx: number, seatNo?: number) => (
    <td key={colIdx} style={{
      border: "1.5px solid #000",
      padding: "6px 4px",
      verticalAlign: "middle",
      height: 90,
      width: "10%",
      backgroundColor: !student ? "#fafafa" : "#ffffff",
      position: "relative",
    }}>
      {student && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", textAlign: "center", lineHeight: 1.2 }}>
          {seatNo !== undefined && (
            <div style={{ position: "absolute", top: 2, left: 4, fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>{seatNo}</div>
          )}
          <div style={{ fontSize: 14, fontWeight: 700 }}>
            {student.nama}
          </div>
          <div style={{ fontSize: 11, color: "#475569", marginTop: 3, fontWeight: 500 }}>({student.kelasNama})</div>
        </div>
      )}
    </td>
  );

  // Render pemanggilan row — with column borders
  const renderPemanggilanRow = (s: any, idx: number) => (
    <tr key={s.id} style={{ borderBottom: "1px solid #cbd5e1", backgroundColor: s.isMartabahUla ? "#dcfce7" : "white" }}>
      <td style={{ width: 40, textAlign: "center", borderRight: "1px solid #94a3b8", padding: "10px 4px", fontWeight: 700, color: "#94a3b8", fontSize: 13 }}>{idx + 1}</td>
      <td style={{ padding: "10px 14px", borderRight: "1px solid #e2e8f0", fontSize: 14 }}>
        <span style={{ fontWeight: s.isMartabahUla ? 800 : 500, color: "#1e293b" }}>
          {s.isMartabahUla && "★ "}
          {s.nama}
        </span>
      </td>
      <td style={{ padding: "10px 14px", textAlign: "right", direction: "rtl", fontSize: 14 }}>
        {s.isMartabahUla ? (
          <span style={{ backgroundColor: "#bbf7d0", border: "1px solid #86efac", color: "#166534", padding: "4px 14px", borderRadius: 4, fontWeight: 700, fontSize: 14, display: "inline-block" }}>الامتياز مع مرتبة الشرف الأولى</span>
        ) : (
          <span>
            <span style={{ fontWeight: 600, fontSize: 15 }}>{s.averagePredikat.arab}</span>
            {s.statusKelulusan === "MUSYAROKAH" && <span style={{ fontSize: 11, color: "#94a3b8", marginRight: 8, background: "#f1f5f9", padding: "2px 8px", borderRadius: 4, border: "1px solid #e2e8f0" }}>Musyarokah</span>}
          </span>
        )}
      </td>
    </tr>
  );

  return (
    <div className="w-full">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex bg-[var(--color-surface)] p-1 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setActiveTab("denah")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition ${activeTab === "denah" ? "bg-white text-[var(--color-text)] shadow-sm" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"}`}
          >
            <Armchair className="w-4 h-4" />
            Denah Tempat Duduk
          </button>
          <button
            onClick={() => setActiveTab("pemanggilan")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition ${activeTab === "pemanggilan" ? "bg-white text-[var(--color-text)] shadow-sm" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"}`}
          >
            <ListOrdered className="w-4 h-4" />
            Urutan Pemanggilan
          </button>
        </div>
        <div className="flex items-center justify-between w-full md:w-auto gap-4">
          <div className="text-sm font-semibold text-[var(--color-text-muted)]">
            Total Masuk: <span className="font-bold text-[var(--color-text)]">{processedSantri.length} Santri</span>
          </div>
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="flex items-center justify-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] disabled:opacity-50 text-white px-4 py-2 rounded-xl font-bold shadow-sm transition"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            {exporting ? "Mengekspor..." : "Export PDF"}
          </button>
        </div>
      </div>

      {/* Content that gets captured for PDF */}
      <div ref={printRef} className="neu-card-white overflow-hidden">
        
        {/* Tab: DENAH */}
        {activeTab === "denah" && (
          <div className="p-3 md:p-6">
            {/* Header Panggung */}
            <div data-pdf-section>
            <div style={{ width: "100%", backgroundColor: "#f8981d", color: "black", fontWeight: 900, textAlign: "center", padding: "10px 0", border: "2px solid black", borderBottom: "none", textTransform: "uppercase", letterSpacing: 4, fontSize: 14 }}>
              PANGGUNG ACARA
            </div>
            <div style={{ width: "100%", display: "flex", border: "2px solid black", borderBottom: "none", height: 48 }}>
              <div style={{ width: 100, backgroundColor: "#00ff00", borderRight: "2px solid black", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, textAlign: "center", textTransform: "uppercase", lineHeight: 1.2, padding: 4 }}>
                PALING KIRI<br/>JALAN KELUAR
              </div>
              <div style={{ flex: 1 }}></div>
              <div style={{ width: 100, backgroundColor: "#00ff00", borderLeft: "2px solid black", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, textAlign: "center", textTransform: "uppercase", lineHeight: 1.2, padding: 4 }}>
                PALING KANAN<br/>JALAN MASUK
              </div>
            </div>
            </div>

            {/* BANIN */}
            <div data-pdf-section style={{ marginTop: 16 }}>
              <div style={{ width: "100%", backgroundColor: "#a3c2e6", color: "#1e293b", fontWeight: 900, textAlign: "center", padding: "10px 0", border: "2px solid black", borderBottom: "none", textTransform: "uppercase", letterSpacing: 4, fontSize: 14 }}>
                ★★★ BANIN ★★★
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", minWidth: 800, borderCollapse: "collapse", border: "2px solid black" }}>
                  <tbody>
                    {chunkArray(denahBanin, 10).map((chunk, rowIdx) => {
                      const reversed = padAndReverse(chunk, 10);
                      return (
                        <tr key={rowIdx}>
                          {reversed.map((student, colIdx) => {
                            const actualIdx = student ? denahBanin.indexOf(student) : -1;
                            return renderDenahCell(student, colIdx, actualIdx >= 0 ? actualIdx + 1 : undefined);
                          })}
                        </tr>
                      );
                    })}
                    {denahBanin.length === 0 && (
                      <tr><td colSpan={10} style={{ textAlign: "center", padding: 24, color: "#94a3b8", border: "1px solid black" }}>Belum ada data Banin</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* BANAT */}
            <div data-pdf-section style={{ marginTop: 32 }}>
              <div style={{ width: "100%", backgroundColor: "#f4b084", color: "#1e293b", fontWeight: 900, textAlign: "center", padding: "10px 0", border: "2px solid black", borderBottom: "none", textTransform: "uppercase", letterSpacing: 4, fontSize: 14 }}>
                ★★★ BANAT ★★★
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", minWidth: 800, borderCollapse: "collapse", border: "2px solid black" }}>
                  <tbody>
                    {chunkArray(denahBanat, 10).map((chunk, rowIdx) => {
                      const reversed = padAndReverse(chunk, 10);
                      return (
                        <tr key={rowIdx}>
                          {reversed.map((student, colIdx) => {
                            const actualIdx = student ? denahBanat.indexOf(student) : -1;
                            return renderDenahCell(student, colIdx, actualIdx >= 0 ? actualIdx + 1 : undefined);
                          })}
                        </tr>
                      );
                    })}
                    {denahBanat.length === 0 && (
                      <tr><td colSpan={10} style={{ textAlign: "center", padding: 24, color: "#94a3b8", border: "1px solid black" }}>Belum ada data Banat</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* PENGUMUMAN */}
            <div data-pdf-section style={{ marginTop: 48, border: "2px solid black", maxWidth: 800, marginLeft: "auto", marginRight: "auto" }}>
              <div style={{ backgroundColor: "#e45b5c", color: "white", fontWeight: 700, textAlign: "center", padding: "10px 0", borderBottom: "2px solid black", textTransform: "uppercase", fontSize: 13, letterSpacing: 2 }}>
                PENGUMUMAN UNTUK PESERTA HAFLAH {dufahLabel.toUpperCase()}
              </div>
              <div style={{ padding: "16px 24px", fontSize: 12, lineHeight: 1.8, backgroundColor: "white" }}>
                <p style={{ marginBottom: 8, color: "#334155" }}>Diharapkan seluruh peserta memperhatikan hal-hal berikut agar prosesi berjalan dengan tertib dan lancar:</p>
                <div style={{ color: "#334155" }}>
                  <p>1. Terdapat dua jalur:</p>
                  <ul style={{ listStyle: "none", paddingLeft: 24, margin: "4px 0" }}>
                    <li>• Jalur masuk berada di sebelah kanan</li>
                    <li>• Jalur keluar berada di sebelah kiri</li>
                  </ul>
                  <p style={{ fontWeight: 700 }}>Maka dari itu, tepi kiri wajib dikosongkan.</p>
                  <p>2. Urutan keluar barisan dimulai dari banat (putri) terlebih dahulu, kemudian disusul oleh banin (putra).</p>
                  <p>3. Saat turun, transisi berjalan dipercepat agar prosesi selanjutnya tidak terhambat.</p>
                  <p>4. Saat sesi foto, mohon menyimak dan mengikuti arahan dari pengatur barisan foto di depan.</p>
                  <p>5. Ketika berfoto, syahadah dipegang di depan dada dengan posisi yang rapi.</p>
                  <p>6. Jika nama belum tercatat, segera konfirmasi kepada petugas KSU.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: PEMANGGILAN */}
        {activeTab === "pemanggilan" && (
          <div style={{ padding: "24px 32px" }}>
            <div data-pdf-section style={{ textAlign: "center", marginBottom: 32 }}>
              <p style={{ fontSize: 14, textTransform: "uppercase", fontWeight: 700, color: "#64748b", letterSpacing: 2 }}>Urutan Pemanggilan Peserta</p>
              <h1 style={{ fontSize: 32, fontWeight: 900, textTransform: "uppercase", letterSpacing: 4, color: "#0f172a", marginTop: 8 }}>
                HAFLAH WADA&apos; {dufahLabel.toUpperCase()}
              </h1>
              <h2 style={{ fontSize: 20, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: "#475569", marginTop: 4 }}>
                Markaz Arabiyah
              </h2>
            </div>

            <div>
              {pemanggilanGroups.map((group) => (
                <div data-pdf-section key={group.kelas?.id} style={{ border: "2px solid black", marginBottom: 24, backgroundColor: "white", overflow: "hidden" }}>
                  {/* Header kelas + wali kelas */}
                  <div style={{ display: "flex", borderBottom: "2px solid black" }}>
                    <div style={{ flex: 1, backgroundColor: "#f1f5f9", fontWeight: 800, padding: 10, textAlign: "center", textTransform: "uppercase", fontSize: 16, letterSpacing: 4, color: "#0f172a" }}>
                      {group.kelas?.nama}
                    </div>
                  </div>
                  <div style={{ padding: "6px 12px", borderBottom: "2px solid black", fontSize: 11, textTransform: "uppercase", fontWeight: 700, color: "#475569", letterSpacing: 1 }}>
                    WALI KELAS: {group.kelas?.waliKelas?.nama || "-"}
                  </div>

                  {/* Side-by-side Banin | Banat */}
                  <div style={{ display: "flex" }}>
                    {/* BANIN column */}
                    <div style={{ flex: 1, borderRight: "2px solid black" }}>
                      <div style={{ backgroundColor: "#a3c2e6", fontWeight: 700, padding: "6px 10px", borderBottom: "1px solid #000", fontSize: 12, textTransform: "uppercase", letterSpacing: 3, color: "#1e293b", textAlign: "center" }}>
                        BANIN
                      </div>
                      <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                        <tbody>
                          {group.banin.length > 0 ? group.banin.map((s, idx) => (
                            <tr key={s.id} style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "white" }}>
                              <td style={{ width: 28, textAlign: "center", borderRight: "1px solid #cbd5e1", padding: "6px 2px", fontWeight: 700, color: "#94a3b8", fontSize: 11 }}>{idx + 1}</td>
                              <td style={{ padding: "6px 8px", borderRight: "1px solid #e2e8f0", fontSize: 13 }}>
                                <span style={{ fontWeight: 500, color: "#1e293b" }}>
                                  {s.nama}
                                </span>
                              </td>
                              <td style={{ padding: "6px 8px", textAlign: "right", direction: "rtl", fontSize: 13 }}>
                                <span>
                                  <span style={{ fontWeight: 600, fontSize: 13 }}>{s.averagePredikat.arab}</span>
                                </span>
                              </td>
                            </tr>
                          )) : (
                            <tr><td style={{ padding: 16, textAlign: "center", color: "#cbd5e1", fontSize: 11 }}>-</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* BANAT column */}
                    <div style={{ flex: 1 }}>
                      <div style={{ backgroundColor: "#f4b084", fontWeight: 700, padding: "6px 10px", borderBottom: "1px solid #000", fontSize: 12, textTransform: "uppercase", letterSpacing: 3, color: "#1e293b", textAlign: "center" }}>
                        BANAT
                      </div>
                      <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                        <tbody>
                          {group.banat.length > 0 ? group.banat.map((s, idx) => (
                            <tr key={s.id} style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "white" }}>
                              <td style={{ width: 28, textAlign: "center", borderRight: "1px solid #cbd5e1", padding: "6px 2px", fontWeight: 700, color: "#94a3b8", fontSize: 11 }}>{idx + 1}</td>
                              <td style={{ padding: "6px 8px", borderRight: "1px solid #e2e8f0", fontSize: 13 }}>
                                <span style={{ fontWeight: 500, color: "#1e293b" }}>
                                  {s.nama}
                                </span>
                              </td>
                              <td style={{ padding: "6px 8px", textAlign: "right", direction: "rtl", fontSize: 13 }}>
                                <span>
                                  <span style={{ fontWeight: 600, fontSize: 13 }}>{s.averagePredikat.arab}</span>
                                </span>
                              </td>
                            </tr>
                          )) : (
                            <tr><td style={{ padding: 16, textAlign: "center", color: "#cbd5e1", fontSize: 11 }}>-</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ))}
              
              {pemanggilanGroups.length === 0 && (
                <div style={{ textAlign: "center", padding: 48, border: "2px dashed #cbd5e1", color: "#94a3b8", borderRadius: 16 }}>
                  Belum ada data santri yang dapat dipanggil.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
