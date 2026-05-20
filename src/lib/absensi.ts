import prisma from "@/lib/prisma";
import { getMasterSantriList } from "@/lib/santri-api";

export { getTodayWibString, parseWibDateString } from "./jadwal-sesi";

export async function syncDufahTable() {
  const masterList = await getMasterSantriList();
  
  // 1. Kumpulkan semua dufah valid dari PPDB
  const validDufahNames = new Set<string>();
  masterList.forEach(m => {
    if (m.dufahNama && m.dufahNama !== "-") {
      validDufahNames.add(m.dufahNama);
    }
  });

  // 2. Ambil dufah yang ada di DB lokal
  const existingDufahs = await prisma.dufah.findMany({ select: { nama: true } });
  const existingNames = new Set(existingDufahs.map(d => d.nama));

  // 3. Hapus dufah (dan riwayat) yang tidak ada di PPDB
  const invalidDufahNames = Array.from(existingNames).filter(name => !validDufahNames.has(name));
  
  if (invalidDufahNames.length > 0) {
    // Cascade-like manual delete karena 'Restrict'
    await prisma.riwayatSantri.deleteMany({
      where: { dufahNama: { in: invalidDufahNames } }
    });
    
    await prisma.dufah.deleteMany({
      where: { nama: { in: invalidDufahNames } }
    });
  }

  // 4. Tambahkan dufah baru dari PPDB yang belum ada di DB
  const missingDufahs = Array.from(validDufahNames).filter(name => !existingNames.has(name));
  if (missingDufahs.length > 0) {
    await prisma.dufah.createMany({
      data: missingDufahs.map(nama => ({ nama })),
      skipDuplicates: true
    });
  }
}

export async function getActiveDufahName(): Promise<string | null> {
  const masterList = await getMasterSantriList();
  const activeDufahs = new Map<string, Date>(); // dufahNama -> date
  masterList.forEach(m => {
    if (m.isAktif && m.dufahNama && m.dufahNama !== "-") {
      const dateVal = m.tanggalMulaiDufah ? new Date(m.tanggalMulaiDufah) : new Date(0);
      if (!activeDufahs.has(m.dufahNama) || dateVal > activeDufahs.get(m.dufahNama)!) {
        activeDufahs.set(m.dufahNama, dateVal);
      }
    }
  });

  if (activeDufahs.size === 0) return null;

  const sorted = Array.from(activeDufahs.entries()).sort((a, b) => {
    const timeDiff = b[1].getTime() - a[1].getTime();
    if (timeDiff !== 0) return timeDiff;
    return b[0].localeCompare(a[0], undefined, { numeric: true, sensitivity: 'base' });
  });

  return sorted[0][0];
}

export type SantriAbsenTarget = {
  riwayatId: string;
  santriId: string;
  nama: string;
  sakan: string;
  kamar: string;
  gender: string;
  kategori: string;
  kelasId: string | null;
  kelasNama: string | null;
  programId: string | null;
  programNama: string | null;
};

/**
 * Mendapatkan daftar riwayat aktif untuk dilakukan absensi.
 * Saat ini diambil dari RiwayatSantri yang memiliki isAktif di master, dsb.
 * Kita akan mengambil berdasarkan kelas jika diberikan kelasId.
 */
export async function getActiveRiwayatListForAbsen(filterKelasId?: string, filterSakan?: string): Promise<SantriAbsenTarget[]> {
  // Ambil data santri aktif dari API
  const masterSantriList = await getMasterSantriList();
  const activeSantriMap = new Map<string, string>(); // santriId -> active dufahNama
  
  for (const ms of masterSantriList) {
    if (ms.isAktif) {
      activeSantriMap.set(ms.id, ms.dufahNama);
    }
  }

  // PENTING: Sinkronkan dulu Dufah table agar tidak memicu P2003 (Foreign Key Constraint Failed)
  await syncDufahTable();

  // SINKRONISASI OTOMATIS: Pastikan santri aktif memiliki RiwayatSantri di DB lokal
  const activeMasterSantri = masterSantriList.filter(ms => ms.isAktif && ms.dufahNama && ms.dufahNama !== "-");
  if (activeMasterSantri.length > 0) {
    const activeSantriIds = activeMasterSantri.map(s => s.id);
    const existingRiwayat = await prisma.riwayatSantri.findMany({
      where: { santriId: { in: activeSantriIds } },
      select: { santriId: true, dufahNama: true }
    });
    
    const riwayatSet = new Set(existingRiwayat.map(r => `${r.santriId}_${r.dufahNama}`));
    const missingRiwayat = activeMasterSantri.filter(ms => !riwayatSet.has(`${ms.id}_${ms.dufahNama}`));
    
    if (missingRiwayat.length > 0) {
      // Upsert SantriInternal
      const existingInternal = await prisma.santriInternal.findMany({
        where: { id: { in: missingRiwayat.map(m => m.id) } },
        select: { id: true }
      });
      const internalIds = new Set(existingInternal.map(s => s.id));
      const newInternals = missingRiwayat.filter(ms => !internalIds.has(ms.id));
      
      if (newInternals.length > 0) {
        await prisma.santriInternal.createMany({
          data: newInternals.map(ms => ({ id: ms.id, nama: ms.nama })),
          skipDuplicates: true
        });
      }
      
      // Create missing RiwayatSantri
      await prisma.riwayatSantri.createMany({
        data: missingRiwayat.map(ms => ({
          santriId: ms.id,
          dufahNama: ms.dufahNama,
          programId: null,
          kelasId: null,
          is_tasmi: false,
          status_kelulusan: "TIDAK_LULUS"
        })),
        skipDuplicates: true
      });
    }
  }

  // Gunakan Prisma untuk mendapatkan data riwayat
  const whereClause: any = {};
  if (filterKelasId && filterKelasId !== "ALL" && filterKelasId !== "UNASSIGNED") {
    if (filterKelasId.startsWith("PROGRAM_")) {
       whereClause.programId = filterKelasId.replace("PROGRAM_", "");
    } else {
       whereClause.kelasId = filterKelasId;
    }
  } else if (filterKelasId === "UNASSIGNED") {
    whereClause.programId = null;
  }

  const allRiwayatList = await prisma.riwayatSantri.findMany({
    where: whereClause,
    include: {
      santri: true,
      kelas: true,
      program: true,
    },
  });

  // Filter HANYA riwayat yang dufah-nya sama dengan dufah master santri yang isAktif
  const activeRiwayatList = allRiwayatList.filter((r) => {
    const activeDufah = activeSantriMap.get(r.santriId);
    return activeDufah && activeDufah === r.dufahNama;
  });

  let mappedList = activeRiwayatList.map((r) => {
    const ms = masterSantriList.find(m => m.id === r.santriId);
    return {
      riwayatId: r.id,
      santriId: r.santriId,
      nama: ms ? ms.nama : (r.santri?.nama ?? "Tanpa Nama"),
      sakan: ms ? ms.sakan : "-",
      kamar: ms ? ms.kamar : "-",
      gender: ms ? ms.gender : "-",
      kategori: ms ? ms.kategori : "-",
      kelasId: r.kelasId,
      kelasNama: r.kelas?.nama ?? null,
      programId: r.programId,
      programNama: r.program?.nama_indo ?? null,
    };
  });

  if (filterSakan && filterSakan !== "ALL") {
    mappedList = mappedList.filter(s => s.sakan === filterSakan);
  }

  return mappedList.sort((a, b) => a.nama.localeCompare(b.nama, "id"));
}
