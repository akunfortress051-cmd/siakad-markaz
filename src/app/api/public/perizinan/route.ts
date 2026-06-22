import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseWibDateString } from "@/lib/jadwal-sesi";
import { generateNomorTasrih } from "@/lib/perizinan-utils";
import { TipeIzin } from "@prisma/client";
import { getActiveRiwayatListForAbsen } from "@/lib/absensi";

export async function GET(request: Request) {
  // Ambil daftar santri aktif untuk dropdown di halaman public
  try {
    const santriList = await getActiveRiwayatListForAbsen();
    // Return only necessary data for dropdown to minimize payload
    const minimalSantri = santriList.map(s => ({
      riwayatId: s.riwayatId,
      nama: s.nama,
      kelasNama: s.kelasNama,
      sakan: s.sakan
    }));
    return NextResponse.json(minimalSantri);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch santri list" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // Public endpoint for submitting perizinan request
  try {
    const body = await request.json();
    const { riwayatIds, tipeIzin, alasan, tanggalMulai, tanggalSelesai } = body;

    if (!riwayatIds || riwayatIds.length === 0 || !tipeIzin || !alasan || !tanggalMulai) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    const tglMulai = parseWibDateString(tanggalMulai);
    const tglSelesai = tanggalSelesai ? parseWibDateString(tanggalSelesai) : null;

    const operations = [];
    const grupTasrihId = crypto.randomUUID();

    for (const riwayatId of riwayatIds) {
      const nomorTasrih = await generateNomorTasrih(tglMulai);
      
      const newIzin = await prisma.perizinan.create({
        data: {
          riwayatId,
          tipeIzin: tipeIzin as TipeIzin,
          alasan,
          tanggalMulai: tglMulai,
          tanggalSelesai: tglSelesai,
          statusIzin: "MENUNGGU", // Status menunggu approval dari keamanan
          nomorTasrih,
          isFromPublic: true,
          createdBy: null, // self-service
          grupTasrihId
        }
      });
      
      operations.push(newIzin);
    }

    return NextResponse.json({ success: true, count: operations.length, grupTasrihId });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal memproses perizinan" }, { status: 500 });
  }
}
