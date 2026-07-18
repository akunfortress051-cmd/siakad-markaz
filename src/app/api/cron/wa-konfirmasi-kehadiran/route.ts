import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { 
  sendWhatsAppMessage, 
  formatKonfirmasiKeamananMessage, 
  formatKonfirmasiSantriMessage 
} from "@/lib/whatsapp";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. Validasi Cron Secret
    const authHeader = request.headers.get("authorization");
    let isValidCron = false;
    
    // Support Vercel cron secret via header
    if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
      isValidCron = true;
    }
    
    // Support local test via query param
    const searchParams = request.nextUrl.searchParams;
    if (searchParams.get("secret") === process.env.CRON_SECRET) {
      isValidCron = true;
    }

    if (!isValidCron && process.env.NODE_ENV !== "development") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Setup today cutoff
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 3. Find overdue perizinan (Belum kembali)
    // Khusus untuk KELUAR_PARE dan BERHARI_HARI
    const unconfirmedIzin = await prisma.perizinan.findMany({
      where: {
        statusIzin: "AKTIF",
        tipeIzin: { in: ["BERHARI_HARI", "KELUAR_PARE"] },
        OR: [
          { tanggalSelesai: { lt: today } },
          { tipeIzin: "KELUAR_PARE", tanggalMulai: { lt: today } }
        ]
      },
      include: {
        riwayat: {
          include: {
            santri: true
          }
        }
      }
    });

    if (unconfirmedIzin.length === 0) {
      return NextResponse.json({ success: true, message: "Tidak ada santri yang belum konfirmasi kehadiran (overdue)." });
    }

    // Siapkan data untuk pengurus keamanan
    const santriToReport = unconfirmedIzin.map(izin => ({
      nama: izin.riwayat.santri.nama || "-",
      sakan: izin.riwayat.santri.sakan || "-",
      tanggalSelesai: (izin.tanggalSelesai || izin.tanggalMulai).toISOString().split("T")[0]
    }));

    const keamananNumber = "085829794312";
    
    // 4. Kirim laporan ke keamanan
    const pesanKeamanan = formatKonfirmasiKeamananMessage(santriToReport);
    await sendWhatsAppMessage(keamananNumber, pesanKeamanan).catch(e => {
      console.error("Gagal kirim WA ke keamanan:", e);
    });

    // 5. Kirim peringatan individual ke masing-masing santri
    let successCount = 0;
    for (const izin of unconfirmedIzin) {
      const santri = izin.riwayat.santri;
      if (santri.noWaSantri && santri.noWaSantri !== "-") {
        const pesanSantri = formatKonfirmasiSantriMessage({
          namaSantri: santri.nama || "-",
          nomorKeamanan: keamananNumber,
          tanggalSelesai: (izin.tanggalSelesai || izin.tanggalMulai).toISOString().split("T")[0]
        });
        
        try {
          await sendWhatsAppMessage(santri.noWaSantri, pesanSantri);
          successCount++;
        } catch (e) {
          console.error(`Gagal kirim peringatan ke santri ${santri.nama}:`, e);
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: "Notification sent successfully",
      summary: {
        total_overdue: unconfirmedIzin.length,
        notification_santri_sent: successCount
      }
    });

  } catch (error: any) {
    console.error("Error wa-konfirmasi-kehadiran:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
