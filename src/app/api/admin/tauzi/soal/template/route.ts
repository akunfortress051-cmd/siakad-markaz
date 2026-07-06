import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { checkPermission } from "@/lib/permission";
import * as XLSX from "xlsx";

export async function GET() {
  const session = await getSession();
  const hasPermission = await checkPermission("tauzi_soal");
  if (!session || (!hasPermission && session.role !== 'ADMIN')) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Buat workbook & worksheet baru
  const wb = XLSX.utils.book_new();
  
  // Header sesuai format import
  const wsData = [
    ["No", "Pertanyaan", "Opsi A", "Opsi B", "Opsi C", "Opsi D", "Kunci Jawaban"],
    ["1", "Man roobuka?", "Allah", "Muhammad", "Islam", "Qur'an", "A"],
    ["2", "Ma dinuka?", "Allah", "Muhammad", "Islam", "Qur'an", "C"],
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set lebar kolom supaya rapi (approximate karakter)
  ws['!cols'] = [
    { wch: 5 },  // No
    { wch: 40 }, // Pertanyaan
    { wch: 20 }, // Opsi A
    { wch: 20 }, // Opsi B
    { wch: 20 }, // Opsi C
    { wch: 20 }, // Opsi D
    { wch: 15 }, // Kunci
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Template_Soal");

  // Output sebagai buffer
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Disposition": `attachment; filename="Template_Soal_Tauzi.xlsx"`,
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
}
