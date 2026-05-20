import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getActiveRiwayatListForAbsen } from "@/lib/absensi";
import { parseWibDateString } from "@/lib/jadwal-sesi";
import { getMasterSantriList } from "@/lib/santri-api";
import { sendWhatsAppMessage, formatKegiatanAlphaReport } from "@/lib/fonnte";

export async function POST(request: Request) {
  try {
    const { tanggal, kategoriId } = await request.json();

    if (!tanggal || !kategoriId) {
      return NextResponse.json(
        { error: "Tanggal dan kategoriId harus diisi" },
        { status: 400 }
      );
    }

    const target = process.env.FONNTE_WA_KEGIATAN_TARGET;
    if (!target) {
      return NextResponse.json(
        { error: "FONNTE_WA_KEGIATAN_TARGET belum dikonfigurasi" },
        { status: 500 }
      );
    }

    // Ambil nama kategori kegiatan
    const kategori = await prisma.kategoriKegiatan.findUnique({
      where: { id: kategoriId },
    });
    if (!kategori) {
      return NextResponse.json(
        { error: "Kategori kegiatan tidak ditemukan" },
        { status: 404 }
      );
    }

    const parsedDate = parseWibDateString(tanggal);

    // Ambil semua santri aktif (tanpa filter sakan/kelas — semua)
    const santriList = await getActiveRiwayatListForAbsen(undefined, "ALL");
    const santriIds = santriList.map((s) => s.riwayatId);

    // Ambil data absensi kegiatan yang sudah tersimpan
    const absenData = await prisma.absenKegiatan.findMany({
      where: {
        tanggal: parsedDate,
        kategoriId,
        riwayatId: { in: santriIds },
      },
    });

    // Build map riwayatId -> status
    const absenMap = new Map<string, string>();
    for (const a of absenData) {
      absenMap.set(a.riwayatId, a.status);
    }

    // Filter santri yang ALPHA
    const alphaList = santriList
      .filter((s) => absenMap.get(s.riwayatId) === "ALPHA")
      .map((s) => ({
        nama: s.nama,
        sakan: s.sakan || "-",
      }));

    if (alphaList.length === 0) {
      return NextResponse.json({
        success: true,
        skipped: true,
        detail: "Tidak ada santri yang alpha, pesan tidak dikirim",
      });
    }

    // Format & kirim pesan
    const message = formatKegiatanAlphaReport(tanggal, kategori.nama, alphaList);
    const result = await sendWhatsAppMessage(target, message);

    if (result.success) {
      return NextResponse.json({
        success: true,
        detail: result.detail,
        alphaCount: alphaList.length,
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.detail || "Gagal mengirim pesan WA" },
        { status: 502 }
      );
    }
  } catch (error: any) {
    console.error("Error send-wa kegiatan:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan sistem", detail: error.message },
      { status: 500 }
    );
  }
}
