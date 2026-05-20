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
