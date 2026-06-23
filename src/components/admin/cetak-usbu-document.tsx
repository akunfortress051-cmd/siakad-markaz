"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "react-hot-toast";
import { QRCodeSVG } from "qrcode.react";
import { Download } from "lucide-react";

interface RowData {
  nama: string;
  gender: string;
  mapelScores: (number | "-")[];
  nilaiAkumulatif: number;
  peringkat: number;
}

export function CetakUsbuDocument({
  kelasNama,
  usbuLabel,
  waliKelas = "______________________",
  mapelHeaders,
  rows
}: {
  kelasNama: string;
  usbuLabel: string;
  waliKelas?: string;
  mapelHeaders: string[];
  rows: RowData[];
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const containerId = `cetak-content-${kelasNama.replace(/\s+/g, '-')}`;

  const handleDownloadPdf = async () => {
    const element = document.getElementById(containerId);
    if (!element) return;

    const loadingToast = toast.loading("Menyiapkan PDF...");

    try {
      // 1. Persiapan elemen (Sembunyikan tombol dll agar tidak ikut ter-render)
      const hiddenElements = element.querySelectorAll('.print-hidden');
      hiddenElements.forEach((el: any) => {
        el.dataset.origDisplay = el.style.display || '';
        el.style.display = 'none';
      });

      const origPadding = element.style.padding;
      element.style.padding = '4px'; // Tambah padding kecil agar border atas tidak terpotong

      // Scroll ke paling atas untuk menghindari bug html2canvas terkait scroll
      window.scrollTo(0, 0);

      // Beri waktu browser untuk reflow layout sebelum capture
      await new Promise(r => setTimeout(r, 100));

      // 2. F4 landscape dimensions (mm): 330.2 x 215.9
      const F4_W = 330.2;
      const F4_H = 215.9;
      const MARGIN = 10; // mm
      const contentW = F4_W - (MARGIN * 2); // 310.2mm printable width
      const contentH = F4_H - (MARGIN * 2); // 195.9mm printable height

      // 3. Render canvas
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        scrollY: 0,
        windowWidth: document.documentElement.offsetWidth,
        windowHeight: document.documentElement.offsetHeight,
      });

      // 4. Hitung ratio konversi dari pixel ke mm
      const elementWidth = element.getBoundingClientRect().width;
      const domToMmRatio = contentW / elementWidth; // Bounding client rect (DOM px) -> mm
      const imgW = contentW;
      const canvasToMmRatio = imgW / canvas.width; // Canvas size -> mm
      const imgH = canvas.height * canvasToMmRatio;

      // 5. Buat PDF F4 landscape
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [F4_W, F4_H] });

      // 6. Dapatkan posisi Y dari setiap <tr> dalam tabel (untuk smart page-break)
      const rows = element.querySelectorAll('tbody tr');
      const elementTop = element.getBoundingClientRect().top;
      const rowPositions: number[] = [];
      rows.forEach(row => {
        const rect = row.getBoundingClientRect();
        // Konversi jarak piksel DOM ke mm!
        rowPositions.push((rect.bottom - elementTop) * domToMmRatio);
      });

      // 7. Proses pemotongan halaman
      let currentY = 0; // posisi Y saat ini di gambar (mm)
      let pageNum = 0;

      while (currentY < imgH) {
        if (pageNum > 0) pdf.addPage([F4_W, F4_H], 'landscape');

        // Cari baris terakhir yang muat di halaman ini
        let sliceH = contentH;
        let bestCut = currentY + contentH;

        // Jika ini bukan halaman terakhir (tambah toleransi 5mm agar tidak terpotong untuk overflow sangat kecil)
        if (imgH - currentY > contentH + 5) {
          // Cari row boundary terdekat yang tidak melebihi batas bawah halaman
          for (const rowBottom of rowPositions) {
            if (rowBottom > currentY && rowBottom <= currentY + contentH) {
              bestCut = rowBottom;
            }
          }

          if (bestCut < currentY + contentH && bestCut > currentY) {
            sliceH = bestCut - currentY;
          }
        } else {
          // Halaman terakhir, muat semua sisa
          sliceH = imgH - currentY;
        }

        // Hindari infinite loop
        if (sliceH <= 0) {
          sliceH = contentH;
        }

        // Potong canvas untuk halaman ini
        const sourceY = currentY / canvasToMmRatio;
        const sourceH = sliceH / canvasToMmRatio;

        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = Math.ceil(sourceH);
        const ctx = pageCanvas.getContext('2d')!;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(canvas, 0, sourceY, canvas.width, sourceH, 0, 0, canvas.width, sourceH);

        const pageImgData = pageCanvas.toDataURL('image/png', 1.0);
        pdf.addImage(pageImgData, 'PNG', MARGIN, MARGIN, imgW, sliceH);

        currentY += sliceH;
        pageNum++;
      }

      // 8. Restore elemen yang disembunyikan
      hiddenElements.forEach((el: any) => {
        el.style.display = el.dataset.origDisplay || '';
      });
      element.style.padding = origPadding;

      // 9. Auto-download
      pdf.save(`Rapor_${kelasNama.replace(/\s+/g, '_')}_Pekan_${usbuLabel}.pdf`);
      toast.success("PDF berhasil diunduh!", { id: loadingToast });
    } catch (error) {
      console.error(error);

      // Pastikan tetap me-restore elemen jika terjadi error
      const hiddenElements = element.querySelectorAll('.print-hidden');
      hiddenElements.forEach((el: any) => {
        el.style.display = el.dataset.origDisplay || '';
      });
      element.style.padding = '';

      toast.error("Gagal membuat PDF", { id: loadingToast });
    }
  };

  const handleDownloadExcel = async () => {
    const loadingToast = toast.loading("Menyiapkan file Excel...");
    try {
      const XLSX = await import("xlsx");

      const totalCols = mapelHeaders.length + 5; // No, Nama, ...mapels, Akumulatif, Peringkat, Gender
      const todayStr = format(new Date(), "dd MMMM yyyy", { locale: id });

      // === Build rows: header section matching the PDF ===
      const sheetData: any[][] = [];

      // Row 1: "DAFTAR NILAI UJIAN AKHIR PEKAN"
      sheetData.push(["DAFTAR NILAI UJIAN AKHIR PEKAN"]);
      // Row 2: Institution name
      sheetData.push(["MARKAZ ARABIYAH BERBASIS MULTIPLE INTELLIGENCES"]);
      // Row 3: Address
      sheetData.push(["Jl. Cempaka 32B, Tegalsari, Tulungrejo, Pare, Kediri, Jawa Timur"]);
      // Row 4: Empty spacer
      sheetData.push([]);
      // Row 5: Kelas + Wali Kelas + Pekan
      sheetData.push([`Kelas: ${kelasNama}`, "", "", "", `Wali Kelas: ${waliKelas}`, "", `Pekan: ${usbuLabel}`]);
      // Row 6: Empty spacer
      sheetData.push([]);

      // Row 7: Table header
      const tableHeaders = ["No", "NAMA PESERTA DIDIK", ...mapelHeaders, "NILAI AKUMULATIF", "PERINGKAT", "GENDER"];
      sheetData.push(tableHeaders);

      // Row 8+: Data rows
      rows.forEach((row, idx) => {
        sheetData.push([
          idx + 1,
          row.nama,
          ...row.mapelScores.map(score => typeof score === "number" ? Math.round(score) : score),
          Math.round(row.nilaiAkumulatif),
          row.peringkat,
          row.gender,
        ]);
      });

      // Footer spacer
      sheetData.push([]);
      // Footer: NB
      sheetData.push(["NB: Setiap ketidakhadiran dikarenakan absen tanpa alasan, maka mendapatkan pengurangan poin (-3) pada nilai presensi"]);
      sheetData.push([]);
      // Footer: Tanggal & TTD
      const ttdColIdx = Math.max(totalCols - 3, 4);
      const ttdRow: any[] = new Array(totalCols).fill("");
      ttdRow[ttdColIdx] = `Pare, ${todayStr}`;
      sheetData.push(ttdRow);

      const gmRow: any[] = new Array(totalCols).fill("");
      gmRow[ttdColIdx] = "General Manager Markaz Arabiyah";
      sheetData.push(gmRow);

      // Empty rows for signature space
      sheetData.push([]);
      sheetData.push([]);

      const nameRow: any[] = new Array(totalCols).fill("");
      nameRow[ttdColIdx] = "Rico Andrian S. Hum";
      sheetData.push(nameRow);

      // === Create worksheet ===
      const ws = XLSX.utils.aoa_to_sheet(sheetData);

      // Auto-fit column widths
      const colWidths = tableHeaders.map((h, i) => {
        let maxLen = String(h).length;
        rows.forEach(row => {
          const dataRow = [row.nama, ...row.mapelScores.map(s => typeof s === "number" ? Math.round(s) : s), Math.round(row.nilaiAkumulatif), row.peringkat, row.gender];
          // offset: col 0 = No (number), col 1+ = dataRow
          const val = i === 0 ? String(rows.length) : String(dataRow[i - 1] ?? "");
          maxLen = Math.max(maxLen, val.length);
        });
        return { wch: Math.min(maxLen + 3, 50) };
      });
      // Make "Nama" column wider
      if (colWidths.length > 1) colWidths[1].wch = Math.max(colWidths[1].wch, 30);
      ws["!cols"] = colWidths;

      // Merge cells for header rows (span across all columns)
      ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } }, // Row 1: Title
        { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } }, // Row 2: Institution
        { s: { r: 2, c: 0 }, e: { r: 2, c: totalCols - 1 } }, // Row 3: Address
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Rapor ${kelasNama}`.slice(0, 31));
      XLSX.writeFile(wb, `Rapor_${kelasNama.replace(/\s+/g, "_")}_Pekan_${usbuLabel}.xlsx`);

      toast.success("File Excel berhasil diunduh!", { id: loadingToast });
    } catch (error) {
      console.error(error);
      toast.error("Gagal membuat file Excel", { id: loadingToast });
    }
  };

  return (
    <div id={containerId} className="mx-auto w-[310mm] bg-[#ffffff] min-h-[195.9mm] flex flex-col justify-between md:p-12 p-4 text-[#000000] print:shadow-none print:w-full print:p-0" style={{ pageBreakAfter: "always", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)" }}>

      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page { size: 330.2mm 215.9mm landscape; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-hidden { display: none !important; }
        }
        tbody tr { page-break-inside: avoid; }
      `}} />

      {/* Header Print Control */}
      <div className="print-hidden mb-8 flex items-center justify-between border-b border-[#e2e8f0] pb-4">
        <h2 className="text-xl font-bold">Data Rapor Usbu&apos;</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadExcel}
            className="flex items-center gap-2 rounded-full bg-[#16a34a] px-6 py-2 font-bold text-[#ffffff] hover:bg-[#15803d]"
            style={{ boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)" }}
          >
            <Download size={16} />
            Export Excel
          </button>
          <button
            onClick={handleDownloadPdf}
            className="rounded-full bg-[#dc2626] px-6 py-2 font-bold text-[#ffffff] hover:bg-[#b91c1c]"
            style={{ boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)" }}
          >
            Download PDF
          </button>
        </div>
      </div>

      <div className="flex-1">
        {/* Title */}
        <div className="text-center font-serif leading-tight mb-8">
          <p className="text-sm uppercase font-bold">Daftar Nilai Ujian Akhir Pekan</p>
          <h1 className="text-2xl font-black uppercase tracking-wide">
            Markaz Arabiyah Berbasis Multiple Intelligences
          </h1>
          <p className="text-xs">
            Jl. Cempaka 32B, Tegalsari, Tulungrejo, Pare, Kediri, Jawa Timur
          </p>
        </div>

        {/* Meta Header Grid */}
        <div className="flex justify-between items-start mb-2 gap-2 overflow-hidden">
          <h1 className="text-5xl font-black uppercase tracking-widest leading-none mt-1 flex-shrink min-w-0">{kelasNama}</h1>

          <div className="flex flex-col flex-shrink-0" style={{ minWidth: '260px' }}>
            <div className="flex w-full">
              <div className="flex items-center justify-end pr-4 text-sm font-bold" style={{ width: '170px' }}>
                WALI KELAS :
              </div>
              <div className="bg-[#5c98c9] text-[#ffffff] text-center font-bold py-1 px-4" style={{ width: '90px' }}>
                Pekan
              </div>
            </div>
            <div className="flex w-full mt-1">
              <div className="bg-[#d03d3f] text-[#ffffff] text-center font-bold py-1 px-4 flex items-center justify-center" style={{ width: '170px' }}>
                {waliKelas}
              </div>
              <div className="bg-[#1e4a79] text-[#ffffff] text-center font-bold py-1 px-4 text-xl" style={{ width: '90px' }}>
                {usbuLabel}
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <table className="w-full border-collapse border border-black text-[13px] font-sans">
          <thead>
            <tr className="bg-[#e48b32] text-black">
              <th className="border border-black px-2 py-2 w-8">No</th>
              <th className="border border-black px-4 py-2 text-left w-64">NAMA PESERTA DIDIK</th>
              {mapelHeaders.map((m, idx) => (
                <th key={idx} className="border border-black px-2 py-2">{m}</th>
              ))}
              <th className="border border-black px-2 py-2">NILAI<br />AKUMULATIF</th>
              <th className="border border-black px-2 py-2">PERINGKAT</th>
              <th className="border border-black px-2 py-2">GENDER</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="text-center">
                <td className="border border-black px-2 py-1">{idx + 1}</td>
                <td className="border border-black px-4 py-1 text-left whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px] font-medium">
                  {row.nama}
                </td>
                {row.mapelScores.map((score, sIdx) => (
                  <td key={sIdx} className="border border-black px-2 py-1">{typeof score === "number" ? Math.round(score) : score}</td>
                ))}
                <td className="border border-black px-2 py-1 font-bold">{Math.round(row.nilaiAkumulatif)}</td>
                <td className="border border-black px-2 py-1 font-bold">{row.peringkat}</td>
                <td className="border border-black px-2 py-1">{row.gender}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Notes */}
      <div className="mt-6 flex justify-between text-[13px] font-serif pr-4 pl-4 items-start">
        <div className="max-w-xs font-semibold italic">
          <p className="font-bold">NB:</p>
          <p>
            Setiap ketidakhadiran dikarenakan absen tanpa alasan, maka mendapatkan pengurangan poin (-3) pada nilai presensi
          </p>
        </div>

        <div className="text-center font-semibold">
          <p>Pare, {format(new Date(), "dd MMMM yyyy", { locale: id })}</p>
          <p>General Manager Markaz Arabiyah</p>
          <div className="mx-auto mt-2 flex items-center justify-center">
            <QRCodeSVG
              value={[
                "BENAR INI ADALAH DOKUMEN YANG SAH,",
                "TTD ATAS NAMA:",
                "[H. TITIS TRILAKSITO, Lc., MA.]",
                "DIREKTUR UTAMA MARKAZ ARABIYAH",
                "TTD, PARE 14 JUNI 2020",
                "VALID_id=198910022019031007",
                "[Status_surat=SIGN/VALID]",
              ].join("\n")}
              size={88}
              level="M"
              bgColor="#ffffff"
              fgColor="#000000"
            />
          </div>
          <p className="mt-2 font-bold text-[13px]">Rico Andrian S. Hum</p>
        </div>
      </div>

    </div>
  );
}
