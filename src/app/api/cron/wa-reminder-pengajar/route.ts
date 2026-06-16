import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendReminderWhatsApp, formatReminderMessage, delay } from "@/lib/fonnte";
import { getTodayWibString, parseWibDateString } from "@/lib/absensi";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Maksimal 60 detik untuk menghindari timeout Vercel

// Helper: konversi "HH:MM" ke menit
function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

// Helper: dapatkan waktu WIB saat ini dalam menit
function getCurrentWibMinutes(): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  const h = parseInt(parts.find((p) => p.type === "hour")?.value || "0");
  const m = parseInt(parts.find((p) => p.type === "minute")?.value || "0");
  return h * 60 + m;
}

// Jeda random antara minMs dan maxMs untuk menghindari spam detection
function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return delay(ms);
}

export async function GET(request: NextRequest) {
  // Validasi secret
  const searchParams = request.nextUrl.searchParams;
  const secret = searchParams.get("secret");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || secret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const todayStr = getTodayWibString();
    const todayDate = parseWibDateString(todayStr);
    const nowMinutes = getCurrentWibMinutes();
    const MAKS_JEDA_MENIT = 120; // Batas maksimal 2 jam setelah sesi tutup

    // ─── 1. Ambil semua jadwal sesi global ───────────────────────────────────
    const globalSesiList = await prisma.jadwalSesi.findMany({
      where: { isActive: true },
    });

    // ─── 2. Ambil semua sesi tambahan program ───────────────────────────────
    const sesiTambahanList = await prisma.sesiTambahanProgram.findMany({
      where: { isActive: true },
    });

    // ─── 3. Gabungkan dan filter sesi yang sudah LEWAT (tapi belum lebih dari 2 jam) ─
    type SesiInfo = { sesi: string; jamTutup: string; toleransiMenit: number };
    const allSesi: SesiInfo[] = [
      ...globalSesiList.map((s) => ({
        sesi: s.sesi as string,
        jamTutup: s.jamTutup,
        toleransiMenit: s.toleransiMenit,
      })),
      ...sesiTambahanList.map((s) => ({
        sesi: s.sesi as string,
        jamTutup: s.jamTutup,
        toleransiMenit: s.toleransiMenit,
      })),
    ];

    // De-duplikasi sesi (jika sesi tambahan overlap dengan global)
    const uniqueSesiMap = new Map<string, SesiInfo>();
    for (const s of allSesi) {
      if (!uniqueSesiMap.has(s.sesi)) {
        uniqueSesiMap.set(s.sesi, s);
      }
    }

    const passedSessions = Array.from(uniqueSesiMap.values()).filter((s) => {
      const tutupMenit = timeToMinutes(s.jamTutup) + s.toleransiMenit;
      const selisih = nowMinutes - tutupMenit;
      // Sudah lewat (selisih > 0) dan belum lebih dari 2 jam (120 menit)
      return selisih > 0 && selisih <= MAKS_JEDA_MENIT;
    });

    if (passedSessions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Tidak ada sesi yang perlu dicek saat ini.",
        nowMinutes,
      });
    }

    // ─── 4. Ambil semua pengajar yang dijadwalkan (PengajarSesi) ─────────────
    const pengajarSesiList = await prisma.pengajarSesi.findMany({
      include: {
        user: { select: { id: true, nama: true, noHp: true } },
        kelas: { select: { id: true, nama: true } },
      },
    });

    // ─── 5. Ambil semua pengajar level program (PengajarSesiProgram) ─────────
    const pengajarSesiProgramList = await prisma.pengajarSesiProgram.findMany({
      include: {
        user: { select: { id: true, nama: true, noHp: true } },
        program: {
          select: {
            id: true,
            nama_indo: true,
            kelasList: { select: { id: true } },
          },
        },
      },
    });

    // ─── 6. Ambil semua AbsenPengajar hari ini ───────────────────────────────
    const absenPengajarHariIni = await prisma.absenPengajar.findMany({
      where: { tanggal: todayDate },
      select: { userId: true, sesi: true },
    });

    const sudahAbsenSet = new Set(
      absenPengajarHariIni.map((a) => `${a.userId}_${a.sesi}`)
    );

    // ─── 7. Ambil semua ReminderLog hari ini yang SUKSES ─────────────────────
    const reminderLogsHariIni = await prisma.reminderLog.findMany({
      where: { 
        tanggal: todayDate,
        success: true // Hanya ambil yang sukses agar yang gagal bisa di-retry
      },
      select: { userId: true, sesi: true },
    });

    const sudahDikirimSet = new Set(
      reminderLogsHariIni.map((r) => `${r.userId}_${r.sesi}`)
    );

    // ─── 8. Proses pengiriman reminder ───────────────────────────────────────
    let totalKirim = 0;
    let totalSkip = 0;
    const errors: string[] = [];

    for (const sesiInfo of passedSessions) {
      const sesiLabel = `Sesi ${sesiInfo.sesi.replace("SESI_", "")}`;

      // --- Pengajar kelas reguler (PengajarSesi) ---
      const pengajarSesiIni = pengajarSesiList.filter(
        (ps) => ps.sesi === sesiInfo.sesi
      );

      for (const ps of pengajarSesiIni) {
        const key = `${ps.user.id}_${ps.sesi}`;

        // Sudah mengisi absen? Skip
        if (sudahAbsenSet.has(key)) {
          totalSkip++;
          continue;
        }

        // Sudah pernah dikirim reminder hari ini untuk sesi ini? Skip
        if (sudahDikirimSet.has(key)) {
          totalSkip++;
          continue;
        }

        // Tidak punya nomor HP? Skip tapi catat log
        if (!ps.user.noHp) {
          totalSkip++;
          continue;
        }

        // Kirim pesan
        const pesan = formatReminderMessage(ps.user.nama, sesiLabel, ps.kelas.nama);
        const result = await sendReminderWhatsApp(ps.user.noHp, pesan);

        // Simpan ReminderLog (agar tidak kirim ulang)
        try {
          // Upsert log agar jika sebelumnya gagal (success: false), sekarang diupdate
          await prisma.reminderLog.upsert({
            where: {
              userId_tanggal_sesi: {
                userId: ps.user.id,
                tanggal: todayDate,
                sesi: ps.sesi as any,
              }
            },
            update: {
              success: result.success,
              sentAt: new Date()
            },
            create: {
              userId: ps.user.id,
              tanggal: todayDate,
              sesi: ps.sesi as any,
              success: result.success,
            },
          });
          if (result.success) sudahDikirimSet.add(key);
        } catch {
          // Abaikan error upsert
        }

        if (result.success) {
          totalKirim++;
        } else {
          errors.push(`Gagal kirim ke ${ps.user.nama} (${ps.sesi}): ${result.detail}`);
        }

        // Jeda 3-5 detik antar pengiriman
        await randomDelay(3000, 5000);
      }

      // --- Pengajar level program (PengajarSesiProgram) ---
      const pengajarProgramIni = pengajarSesiProgramList.filter(
        (psp) => psp.sesi === sesiInfo.sesi
      );

      for (const psp of pengajarProgramIni) {
        const key = `${psp.user.id}_${psp.sesi}`;

        if (sudahAbsenSet.has(key)) {
          totalSkip++;
          continue;
        }

        if (sudahDikirimSet.has(key)) {
          totalSkip++;
          continue;
        }

        if (!psp.user.noHp) {
          totalSkip++;
          continue;
        }

        const kelasNama = `Program ${psp.program.nama_indo}`;
        const pesan = formatReminderMessage(psp.user.nama, sesiLabel, kelasNama);
        const result = await sendReminderWhatsApp(psp.user.noHp, pesan);

        try {
          await prisma.reminderLog.upsert({
            where: {
              userId_tanggal_sesi: {
                userId: psp.user.id,
                tanggal: todayDate,
                sesi: psp.sesi as any,
              }
            },
            update: {
              success: result.success,
              sentAt: new Date()
            },
            create: {
              userId: psp.user.id,
              tanggal: todayDate,
              sesi: psp.sesi as any,
              success: result.success,
            },
          });
          if (result.success) sudahDikirimSet.add(key);
        } catch {
          // Abaikan error upsert
        }

        if (result.success) {
          totalKirim++;
        } else {
          errors.push(`Gagal kirim ke ${psp.user.nama} (${psp.sesi}): ${result.detail}`);
        }

        await randomDelay(3000, 5000);
      }
    }

    return NextResponse.json({
      success: true,
      tanggal: todayStr,
      sesiDicek: passedSessions.map((s) => s.sesi),
      totalKirim,
      totalSkip,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("[wa-reminder-pengajar] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
