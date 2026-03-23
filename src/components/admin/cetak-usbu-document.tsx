"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

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

  const handleDownloadExcel = () => {
    const table = document.getElementById('rapor-table');
    if (!table) return;
    
    const htmlSnippet = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Rapor Usbu</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          table { border-collapse: collapse; font-family: sans-serif; font-size: 13px; }
          th, td { border: 1px solid black; padding: 4px; text-align: center; }
          th { background-color: #e48b32; font-weight: bold; }
        </style>
      </head>
      <body>
        <h3>DAFTAR NILAI UJIAN AKHIR PEKAN | MARKAZ ARABIYAH</h3>
        <p>Kelas: ${kelasNama}</p>
        <p>Wali Kelas: ${waliKelas}</p>
        <p>Pekan: ${usbuLabel}</p>
        <br/>
        ${table.outerHTML}
        <br/>
        <p>NB: Setiap ketidakhadiran dikarenakan absen tanpa alasan, maka mendapatkan pengurangan poin (-3) pada nilai presensi</p>
      </body>
      </html>
    `;
    
    const blob = new Blob([htmlSnippet], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rapor_${kelasNama.replace(/\\s+/g, '_')}_Pekan_${usbuLabel}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto w-[297mm] bg-white min-h-[210mm] shadow-xl md:p-12 p-4 text-black print:shadow-none print:w-full print:p-0" style={{ pageBreakAfter: "always" }}>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-hidden { display: none !important; }
        }
      `}} />

      {/* Header Print Control */}
      <div className="print-hidden mb-8 flex items-center justify-between border-b pb-4">
        <h2 className="text-xl font-bold">Data Rapor Usbu'</h2>
        <button
          onClick={handleDownloadExcel}
          className="rounded-full bg-emerald-600 px-6 py-2 font-bold text-white shadow hover:bg-emerald-700"
        >
          Download Excel (.xls)
        </button>
      </div>

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
      <div className="flex justify-between items-end mb-2">
        <h1 className="text-5xl font-black uppercase tracking-widest">{kelasNama}</h1>
        
        <div className="flex flex-col items-end w-1/3">
          <div className="w-full flex">
            <div className="w-2/3 flex items-center justify-end pr-4 text-sm font-bold">
              WALI KELAS :
            </div>
            <div className="w-1/3 bg-[#5c98c9] text-white text-center font-bold py-1 px-4">
              Pekan
            </div>
          </div>
          <div className="w-full flex mt-1">
            <div className="w-2/3 bg-[#d03d3f] text-white text-center font-bold py-1 px-4 h-full flex items-center justify-center">
              {waliKelas}
            </div>
            <div className="w-1/3 bg-[#1e4a79] text-white text-center font-bold py-1 px-4 text-xl">
              {usbuLabel}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <table id="rapor-table" className="w-full border-collapse border border-black text-[13px] font-sans">
        <thead>
          <tr className="bg-[#e48b32] text-black">
            <th className="border border-black px-2 py-2 w-8">No</th>
            <th className="border border-black px-4 py-2 text-left w-64">NAMA PESERTA DIDIK</th>
            {mapelHeaders.map((m, idx) => (
              <th key={idx} className="border border-black px-2 py-2">{m}</th>
            ))}
            <th className="border border-black px-2 py-2">NILAI<br/>AKUMULATIF</th>
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
                <td key={sIdx} className="border border-black px-2 py-1">{score}</td>
              ))}
              <td className="border border-black px-2 py-1 font-bold">{row.nilaiAkumulatif}</td>
              <td className="border border-black px-2 py-1 font-bold">{row.peringkat}</td>
              <td className="border border-black px-2 py-1">{row.gender}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer Notes */}
      <div className="mt-8 flex justify-between text-[13px] font-serif pr-16 pl-4">
        <div className="max-w-xs font-semibold italic">
          <p className="font-bold">NB:</p>
          <p>
            Setiap ketidakhadiran dikarenakan absen tanpa alasan, maka mendapatkan pengurangan poin (-3) pada nilai presensi
          </p>
        </div>

        <div className="text-center font-semibold">
          <p>Pare, {format(new Date(), "dd MMMM yyyy", { locale: id })}</p>
          <p>Ketua Program Markaz Arabiyah</p>
          <div className="h-20 w-20 mx-auto mt-4 border-2 border-dashed border-slate-300 flex items-center justify-center text-[10px] text-slate-400">
            Ttd / QR
          </div>
        </div>
      </div>

    </div>
  );
}
