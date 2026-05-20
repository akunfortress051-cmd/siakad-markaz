/**
 * Fonnte WhatsApp API integration
 * Utility untuk mengirim laporan absensi ke grup WhatsApp via Fonnte.
 */

const FONNTE_API_URL = "https://api.fonnte.com/send";

/**
 * Mengirim pesan WhatsApp via Fonnte API.
 */
export async function sendWhatsAppMessage(target: string, message: string): Promise<{ success: boolean; detail?: string }> {
  const token = process.env.FONNTE_API_TOKEN;
  if (!token) {
    return { success: false, detail: "FONNTE_API_TOKEN belum dikonfigurasi di .env" };
  }

  try {
    const res = await fetch(FONNTE_API_URL, {
      method: "POST",
      headers: {
        Authorization: token,
      },
      body: new URLSearchParams({
        target,
        message,
      }),
    });

    const data = await res.json();

    if (data.status === true || data.status === "true") {
      return { success: true, detail: data.detail || "Pesan terkirim" };
    }

    return { success: false, detail: data.detail || data.reason || "Gagal mengirim pesan" };
  } catch (error: any) {
    return { success: false, detail: error.message || "Network error" };
  }
}

/**
 * Nama hari dalam bahasa Indonesia.
 */
const HARI_INDO = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

/**
 * Nama bulan dalam bahasa Indonesia.
 */
const BULAN_INDO = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/**
 * Format tanggal menjadi "*Selasa, 19 Mei 2026*" (bold WhatsApp).
 * Parameter tanggal dalam format YYYY-MM-DD.
 */
export function formatTanggalWa(tanggalStr: string): string {
  const parts = tanggalStr.split("-");
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const date = new Date(year, month, day);

  const hari = HARI_INDO[date.getDay()];
  const bulan = BULAN_INDO[date.getMonth()];

  return `*${hari}, ${day} ${bulan} ${year}*`;
}

/**
 * Format laporan status absen SEMUA sakan menjadi pesan WhatsApp.
 *
 * Contoh output:
 * ```
 * *Rabu, 20 Mei 2026*
 *
 * • Al Muhdor ✅
 * • Al Jufri ✅
 * • Aidid
 * • Maula kheila ✅
 * • Baharun
 * • Bin Syihab ✅
 * • Turots ✅
 *   📝 Ratu Adilah: izin pulang
 * ```
 *
 * ✅ = sakan sudah mengisi absensi
 * Tanpa centang = sakan belum mengisi absensi
 * 📝 = keterangan santri di bawah sakan terkait
 */
export function formatSakanStatusReport(
  tanggalStr: string,
  allSakan: string[],
  sudahAbsen: string[],
  keteranganPerSakan: Map<string, { nama: string; keterangan: string }[]>,
): string {
  const header = formatTanggalWa(tanggalStr);
  const sudahSet = new Set(sudahAbsen);

  const lines: string[] = [header, ""];

  for (const sakanName of allSakan) {
    const check = sudahSet.has(sakanName) ? " ✅" : "";
    lines.push(`• ${sakanName}${check}`);

    // Tampilkan keterangan santri di bawah sakan ini
    const ketList = keteranganPerSakan.get(sakanName);
    if (ketList && ketList.length > 0) {
      for (const ket of ketList) {
        lines.push(`  📝 ${ket.nama}: _${ket.keterangan}_`);
      }
    }
  }

  return lines.join("\n");
}

/**
 * Format laporan santri ALPHA pada kegiatan untuk dikirim ke bagian keamanan/kedisiplinan.
 * 
 * Contoh output:
 * ```
 * يرجي من الأسماء المكتوبة أدناه الاتجاه إلى الرواق التنفيذي في قسم الأمن والانضباط بعد الدراسة
 * 
 * Diharapkan semua nama-nama yang tertulis dibawah ini, untuk menghadap ke ruang pengurus dibagian keamanan dan kedisiplinan setelah pembelajaran
 * 
 * *Daftar Alpha - Halaqoh*
 * *Rabu, 20 Mei 2026*
 * 
 * 1. Ainur Syafiq - Balfaqih
 * 2. Arsil Azim - Ba'alawy
 * ...
 * 
 * سأنتظركم حتى الساعة الواحدة
 * Saya tunggu sampai jam dari jam 11.45- 13.00
 * 
 * NB : *tanda 1x menandakan tidak hadir pemanggilan 1x,...*
 * ```
 */
export function formatKegiatanAlphaReport(
  tanggalStr: string,
  kegiatanNama: string,
  alphaList: { nama: string; sakan: string }[],
): string {
  const lines: string[] = [];

  // Header Arabic
  lines.push("يرجي  من الأسماء المكتوبة أدناه الاتجاه إلى الرواق التنفيذي في قسم الأمن والانضباط بعد الدراسة");
  lines.push("");
  // Header Indonesian
  lines.push("Diharapkan semua nama-nama yang tertulis dibawah ini, untuk menghadap ke ruang pengurus dibagian keamanan dan kedisiplinan setelah pembelajaran");
  lines.push("");

  // Tanggal + nama kegiatan
  lines.push(`*Daftar Alpha - ${kegiatanNama}*`);
  lines.push(formatTanggalWa(tanggalStr));
  lines.push("");

  // Numbered list: Nama - Sakan
  alphaList.forEach((s, i) => {
    lines.push(`${i + 1}. ${s.nama} - ${s.sakan}`);
  });

  lines.push("");
  lines.push("سأنتظركم حتى الساعة الواحدة");
  lines.push("Saya tunggu sampai jam dari jam 11.45- 13.00");
  lines.push("");
  lines.push("NB : *tanda 1x menandakan tidak hadir pemanggilan 1x,tanda 2x menandakan tidak hadir pemanggilan 2x, tanda 3x tidak hadir pemanggilan 3x dan jika sudah sampai 3x maka akan berlaku SP 1 ,tambahan bagi yang telat ataupun tidak hadir*");

  return lines.join("\n");
}
