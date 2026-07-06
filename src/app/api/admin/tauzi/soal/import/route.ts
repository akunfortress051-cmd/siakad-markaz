import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { checkPermission } from "@/lib/permission";
import * as XLSX from "xlsx";

function getRichTextFromCell(cell: any): string {
  if (!cell) return "";
  
  // SheetJS kadang menyediakan representasi HTML di cell.h
  if (cell.h) {
    return String(cell.h);
  }

  let result = "";

  // Jika ada runs rich text (multiple styles dalam 1 cell)
  if (cell.r && Array.isArray(cell.r)) {
    for (const run of cell.r) {
      if (!run.t) continue;
      
      let text = run.t;
      // Gunakan regex global untuk line breaks
      text = text.replace(/(?:\r\n|\r|\n)/g, '<br/>');

      let prefix = "";
      let suffix = "";

      // Cek style untuk run ini
      if (run.s) {
        if (run.s.b || run.s.bold) {
          prefix += "<b>";
          suffix = "</b>" + suffix;
        }
        if (run.s.u || run.s.underline) {
          prefix += "<u>";
          suffix = "</u>" + suffix;
        }
        if (run.s.i || run.s.italic) {
          prefix += "<i>";
          suffix = "</i>" + suffix;
        }
      }

      result += `${prefix}${text}${suffix}`;
    }
  } else {
    // Falls back to raw value/text jika tidak ada rich text
    result = String(cell.w || cell.v || "").replace(/(?:\r\n|\r|\n)/g, '<br/>');
    
    // Jika seluruh cell diloncati style
    if (cell.s && cell.s.font) {
      if (cell.s.font.bold) {
        result = `<b>${result}</b>`;
      }
      if (cell.s.font.underline) {
        result = `<u>${result}</u>`;
      }
      if (cell.s.font.italic) {
        result = `<i>${result}</i>`;
      }
    }
  }

  return result.trim();
}

export async function POST(request: Request) {
  const session = await getSession();
  const hasPermission = await checkPermission("tauzi_soal");
  if (!session || (!hasPermission && session.role !== 'ADMIN')) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const sesiTauziId = formData.get("sesiTauziId") as string;
    const programId = formData.get("programId") as string;
    const timpaSoal = formData.get("timpaSoal") === "true";

    if (!file || !sesiTauziId || !programId) {
      return NextResponse.json({ error: "File, Sesi, dan Program wajib diisi" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const wb = XLSX.read(buffer, { type: "buffer", cellStyles: true });
    // Ambil sheet pertama
    const ws = wb.Sheets[wb.SheetNames[0]];

    // Untuk dpt membaca formating tiap sel
    const range = XLSX.utils.decode_range(ws['!ref'] || "A1:G1");
    // Asumsi: Header di baris 0, data mulai dari baris 1
    // Kolom: A=No, B=Pertanyaan, C=Opsi A, D=Opsi B, E=Opsi C, F=Opsi D, G=Kunci(A/B/C/D)

    interface JawabanImport {
      teks: string;
      isCorrect: boolean;
      urutan: number;
    }

    interface SoalImport {
      sesiTauziId: string;
      programId: string;
      pertanyaan: string;
      urutan: number;
      jawabanList: JawabanImport[];
    }

    const soalListToCreate: SoalImport[] = [];

    for (let r = 1; r <= range.e.r; r++) { // skip header r=0
      const pertCell = ws[XLSX.utils.encode_cell({ r, c: 1 })]; // Kolom B
      if (!pertCell || !pertCell.v) continue; // Skip baris kosong

      const urutanCell = ws[XLSX.utils.encode_cell({ r, c: 0 })];
      const urutanVal = urutanCell?.v ? parseInt(String(urutanCell.v)) : r;

      const pertanyaan = getRichTextFromCell(pertCell);
      
      const opsiACell = ws[XLSX.utils.encode_cell({ r, c: 2 })]; // C
      const opsiBCell = ws[XLSX.utils.encode_cell({ r, c: 3 })]; // D
      const opsiCCell = ws[XLSX.utils.encode_cell({ r, c: 4 })]; // E
      const opsiDCell = ws[XLSX.utils.encode_cell({ r, c: 5 })]; // F
      const kunciCell = ws[XLSX.utils.encode_cell({ r, c: 6 })]; // G

      const kunci = String(kunciCell?.w || kunciCell?.v || "").trim().toUpperCase();

      const jawabanArr: JawabanImport[] = [
        { teks: getRichTextFromCell(opsiACell), isCorrect: kunci === 'A', urutan: 1 },
        { teks: getRichTextFromCell(opsiBCell), isCorrect: kunci === 'B', urutan: 2 },
        { teks: getRichTextFromCell(opsiCCell), isCorrect: kunci === 'C', urutan: 3 },
        { teks: getRichTextFromCell(opsiDCell), isCorrect: kunci === 'D', urutan: 4 },
      ].filter(o => o.teks !== "");

      if (jawabanArr.length < 2) continue; // Invalid soal
      
      // Jika ternyata ga satupun yang benar, set opsi pertama sebagai benar.
      if (!jawabanArr.some(j => j.isCorrect)) {
        jawabanArr[0].isCorrect = true;
      }

      soalListToCreate.push({
        sesiTauziId,
        programId,
        pertanyaan: pertanyaan,
        urutan: isNaN(urutanVal) ? r : urutanVal,
        jawabanList: jawabanArr
      });
    }

    if (soalListToCreate.length === 0) {
      return NextResponse.json({ error: "Tidak ada data soal valid yang ditemukan dalam excel." }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      // Jika mode timpaSoal true, hapus semua soal di program & sesi tsb
      if (timpaSoal) {
        await tx.soalTauzi.deleteMany({
          where: { sesiTauziId, programId }
        });
      }

      // Hitung offset urutan jika tidak menimpa dan ambil yg terbesar
      let urutanOffset = 0;
      if (!timpaSoal) {
        const lastSoal = await tx.soalTauzi.findFirst({
          where: { sesiTauziId, programId },
          orderBy: { urutan: 'desc' }
        });
        if (lastSoal) {
          urutanOffset = lastSoal.urutan;
        }
      }

      // Insert soal & jawaban
      for (const [index, soalItem] of soalListToCreate.entries()) {
        const urutanFix = timpaSoal ? soalItem.urutan : (urutanOffset + index + 1);
        
        await tx.soalTauzi.create({
          data: {
            sesiTauziId: soalItem.sesiTauziId,
            programId: soalItem.programId,
            pertanyaan: soalItem.pertanyaan,
            urutan: urutanFix,
            jawabanList: {
              create: soalItem.jawabanList.map((j: JawabanImport) => ({
                teks: j.teks,
                isCorrect: j.isCorrect,
                urutan: j.urutan
              }))
            }
          }
        });
      }
    });

    return NextResponse.json({ success: true, count: soalListToCreate.length });
  } catch (error: any) {
    console.error("Error import excel soal:", error);
    return NextResponse.json({ error: "Gagal mengimport soal dari excel" }, { status: 500 });
  }
}
