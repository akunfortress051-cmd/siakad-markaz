/**
 * Fonnte WhatsApp API integration
 * Utility untuk mengirim laporan absensi ke grup WhatsApp via Fonnte.
 */

const WA_API_URL = "https://wa-multi-session.amtsilatipusat.com/api/v1";

/**
 * Mengirim pesan WhatsApp via WA Multi Session API.
 */
export async function sendWhatsAppMessage(target: string, message: string): Promise<{ success: boolean; detail?: string }> {
  const apiKey = process.env.WA_API_KEY || "024a3190-cfd8-4da6-8e82-7ac0f6c568d0";
  const sessionId = process.env.WA_SESSION_ID || "default";

  if (!apiKey) {
    return { success: false, detail: "WA_API_KEY belum dikonfigurasi" };
  }

  // Handle multiple targets if Fonnte passed comma-separated targets
  const targets = target.split(",").map(t => t.trim()).filter(t => t.length > 0);
  
  if (targets.length === 0) {
    return { success: false, detail: "Target penerima kosong" };
  }

  try {
    let lastError = null;
    let successCount = 0;

    for (const t of targets) {
      const res = await fetch(`${WA_API_URL}/sessions/${sessionId}/send`, {
        method: "POST",
        headers: {
          "X-API-Key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: t,
          message: message,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        successCount++;
      } else {
        lastError = data.message || data.error || `HTTP Error ${res.status}`;
      }
    }

    if (successCount > 0) {
      return { success: true, detail: "Pesan terkirim" };
    }

    return { success: false, detail: lastError || "Gagal mengirim pesan" };
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
