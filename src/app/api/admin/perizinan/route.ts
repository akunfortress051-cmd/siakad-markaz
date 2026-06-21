import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { parseWibDateString } from "@/lib/jadwal-sesi";
import { generateNomorTasrih, processAutoAbsensiIzin } from "@/lib/perizinan-utils";
import { TipeIzin } from "@prisma/client";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const tipe = searchParams.get("tipe");
  const status = searchParams.get("status");
  const sakan = searchParams.get("sakan");
  const kelasId = searchParams.get("kelasId");

  let whereClause: any = {};
  if (tipe && tipe !== "ALL") whereClause.tipeIzin = tipe;
  if (status && status !== "ALL") whereClause.statusIzin = status;
  if (kelasId && kelasId !== "ALL") whereClause.riwayat = { kelasId: kelasId };

  try {
    const data = await prisma.perizinan.findMany({
      where: whereClause,
      include: {
        riwayat: {
          include: {
            santri: true,
            kelas: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    // Manual filter for sakan if needed (since it's not directly in DB, but we usually get it from master API)
    // Actually, to display properly, frontend usually maps it with getActiveRiwayatListForAbsen.
    // For now we just return DB records, frontend will merge with master santri.
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch perizinan" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { riwayatIds, tipeIzin, alasan, tanggalMulai, tanggalSelesai } = body;

    if (!riwayatIds || riwayatIds.length === 0 || !tipeIzin || !alasan || !tanggalMulai) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    const tglMulai = parseWibDateString(tanggalMulai);
    const tglSelesai = tanggalSelesai ? parseWibDateString(tanggalSelesai) : null;

    const operations = [];

    for (const riwayatId of riwayatIds) {
      const nomorTasrih = await generateNomorTasrih(tglMulai);
      
      const newIzin = await prisma.perizinan.create({
        data: {
          riwayatId,
          tipeIzin: tipeIzin as TipeIzin,
          alasan,
          tanggalMulai: tglMulai,
          tanggalSelesai: tglSelesai,
          statusIzin: "AKTIF",
          nomorTasrih,
          createdBy: session.userId,
          isFromPublic: false
        }
      });
      
      operations.push(newIzin);

      // Jalankan proses auto absensi
      await processAutoAbsensiIzin(
        riwayatId, 
        tipeIzin as TipeIzin, 
        tglMulai, 
        tglSelesai, 
        alasan, 
        nomorTasrih
      );
    }

    return NextResponse.json({ success: true, count: operations.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal membuat perizinan" }, { status: 500 });
  }
}
