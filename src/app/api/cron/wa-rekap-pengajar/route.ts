import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { sendWhatsAppMessage } from "@/lib/fonnte";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  let dari = searchParams.get("dari") || searchParams.get("date");
  let sampai = searchParams.get("sampai") || searchParams.get("date");

  if (!dari || !sampai) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric', month: '2-digit', day: '2-digit'
    });
    dari = formatter.format(new Date());
    sampai = dari;
  }

  try {
    const origin = request.nextUrl.origin;
    // Panggil API rekap pengajar yang sudah ada
    const fetchUrl = `${origin}/api/admin/absensi/rekap/pengajar?dari=${dari}&sampai=${sampai}`;

    // Header x-forwarded-host dan cookie dilempar agar session admin tidak tertolak jika API memerlukan auth (meskipun rekap API tampaknya publik/tidak ber-session dalam route handler-nya)
    const res = await fetch(fetchUrl, {
      headers: {
        cookie: request.headers.get("cookie") || "",
        "x-cron-secret": process.env.CRON_SECRET || "",
      }
    });

    if (!res.ok) {
      console.error("Fetch failed:", await res.text());
      return NextResponse.json({ error: "Gagal memuat data rekap pengajar" }, { status: 500 });
    }

    const records = await res.json();
    const alphaRecords = records.filter((r: any) => r.status === "ALPHA");

    if (alphaRecords.length === 0) {
      return NextResponse.json({ success: true, message: "Tidak ada pengajar yang ALPHA pada tanggal ini." });
    }

    const dateFormattedDari = format(new Date(dari!), "EEEE, d MMMM yyyy", { locale: id });
    const dateFormattedSampai = format(new Date(sampai!), "EEEE, d MMMM yyyy", { locale: id });
    const dateDisplay = dari === sampai ? dateFormattedDari : `${dateFormattedDari} - ${dateFormattedSampai}`;
    let message = `*REKAP PENGAJAR YANG BELUM MENGISI ABSEN*\n*${dateDisplay}*\n\n`;

    // Group by Kelas atau cukup list
    alphaRecords.forEach((r: any, index: number) => {
      const sesiLabel = r.sesi ? r.sesi.replace("SESI_", "Sesi ") : "";
      message += `${index + 1}. ${r.pengajar} - ${r.kelas} - ${sesiLabel}\n`;
    });

    const targetWa = "6281227225453"; // Diubah ke format 62 agar kompatibel dengan WA API
    const result = await sendWhatsAppMessage(targetWa, message.trim());

    return NextResponse.json({
      success: result.success,
      message: result.success ? "Laporan berhasil dikirim" : "Gagal mengirim laporan",
      detail: result.detail,
      data_count: alphaRecords.length
    });
  } catch (error: any) {
    console.error("Error wa-rekap-pengajar:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
