import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseWibDateString } from "@/lib/absensi";
import { getMasterSantriList } from "@/lib/santri-api";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // "sakan", "kelas", "kegiatan"
    const kategoriId = searchParams.get("kategoriId"); // required if type === "kegiatan"
    const dari = searchParams.get("dari");
    const sampai = searchParams.get("sampai");

    if (!type || !["sakan", "kelas", "kegiatan"].includes(type)) {
      return NextResponse.json({ error: "Tipe rekap tidak valid" }, { status: 400 });
    }

    const dateFilter: any = {};
    if (dari) dateFilter.gte = new Date(`${dari}T00:00:00Z`);
    if (sampai) dateFilter.lte = new Date(`${sampai}T23:59:59Z`);
    const tanggalWhere = Object.keys(dateFilter).length > 0 ? { tanggal: dateFilter } : {};

    let records: any[] = [];

    // Helper untuk select relasi
    const riwayatInclude = {
      riwayat: {
        include: {
          santri: true,
          kelas: { select: { nama: true } },
          program: { select: { nama_indo: true } },
        }
      }
    };

    if (type === "sakan") {
      records = await prisma.absenSakan.findMany({
        where: tanggalWhere,
        include: riwayatInclude,
      });
    } else if (type === "kelas") {
      records = await prisma.absenKelas.findMany({
        where: tanggalWhere,
        include: riwayatInclude,
      });
    } else if (type === "kegiatan") {
      const kegWhere = kategoriId ? { ...tanggalWhere, kategoriId: kategoriId as string } : tanggalWhere;
      records = await prisma.absenKegiatan.findMany({
        where: kegWhere,
        include: {
          ...riwayatInclude,
          kategori: { select: { nama: true } }
        },
      });
    }

    // Ambil master santri untuk filter hanya riwayat aktif
    const masterSantriList = await getMasterSantriList();
    const activeSantriMap = new Map<string, string>();
    for (const ms of masterSantriList) {
      if (ms.isAktif) {
        activeSantriMap.set(ms.id, ms.dufahNama);
      }
    }

    // Ambil data Dufah untuk mengetahui batas Usbu'
    const dufahList = await prisma.dufah.findMany();
    const dufahMap = new Map<string, any>();
    for (const d of dufahList) {
      dufahMap.set(d.nama, d);
    }

    // Filter output: Hanya yang dufah-nya sama dengan active dufah
    const filteredRecords = records.filter(r => {
      const activeDufah = activeSantriMap.get(r.riwayat.santriId);
      return activeDufah && activeDufah === r.riwayat.dufahNama;
    });

    const result = filteredRecords.map((r) => {
      const ms = masterSantriList.find(m => m.id === r.riwayat.santriId);
      
      // Fix timezone offset (Prisma UTC vs WIB literal)
      const tanggalStr = r.tanggal.toISOString().split("T")[0];

      // Tentukan Usbu'
      let usbuLabel = "Usbu' 1";
      const df = dufahMap.get(r.riwayat.dufahNama);
      if (df) {
        const u1 = df.usbu1EndDate ? new Date(df.usbu1EndDate).getTime() : Infinity;
        const u2 = df.usbu2EndDate ? new Date(df.usbu2EndDate).getTime() : Infinity;
        
        // r.tanggal is already 00:00:00 UTC representing the day. df.usbuEndDate is also 00:00:00 UTC.
        const tTime = r.tanggal.getTime();
        
        if (tTime <= u1) usbuLabel = "Usbu' 1";
        else if (tTime <= u2) usbuLabel = "Usbu' 2";
        else usbuLabel = "Nihai";
      }

      return {
        id: r.id,
        riwayatId: r.riwayatId,
        namaSantri: ms ? ms.nama : (r.riwayat.santri?.nama || "Tanpa Nama"),
        sakan: ms ? ms.sakan : "-",
        kelas: r.riwayat.kelas?.nama || r.riwayat.program?.nama_indo || "-",
        sesi: r.sesi || null,
        kegiatanNama: r.kategori?.nama || null,
        status: r.status,
        keterangan: r.keterangan || "-",
        tanggal: tanggalStr,
        usbu: usbuLabel,
      };
    });

    // Urutkan berdasarkan nama
    result.sort((a, b) => a.namaSantri.localeCompare(b.namaSantri));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error detail rekap:", error);
    return NextResponse.json({ error: "Terjadi kesalahan sistem" }, { status: 500 });
  }
}
