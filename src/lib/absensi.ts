import prisma from "@/lib/prisma";

const TIMEZONE = "Asia/Jakarta";

/**
 * Parses a YYYY-MM-DD string into a standard JS Date object 
 * representing exactly 00:00:00 WIB (Asia/Jakarta).
 * This explicitly uses +07:00 offset so it's immune to server timezone.
 */
export function parseWibDateString(dateString: string): Date {
  return new Date(`${dateString}T00:00:00+07:00`);
}

/**
 * Returns today's date formatted as "YYYY-MM-DD" in WIB
 */
export function getTodayWibString(): string {
  // To get current WIB time: Get current UTC time, add 7 hours, then format.
  const now = new Date();
  const wibTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
  return wibTime.toISOString().split("T")[0];
}

export type SantriAbsenTarget = {
  riwayatId: string;
  santriId: string;
  nama: string;
  sakan: string;
  kamar: string;
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
export async function getActiveRiwayatListForAbsen(filterKelasId?: string): Promise<SantriAbsenTarget[]> {
  // Gunakan Prisma untuk mendapatkan data riwayat
  // Kita ingin mencari filterKelasId dan juga join dengan SantriInternal
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

  const riwayatList = await prisma.riwayatSantri.findMany({
    where: whereClause,
    include: {
      santri: true,
      kelas: true,
      program: true,
    },
  });

  return riwayatList.map((r) => ({
    riwayatId: r.id,
    santriId: r.santriId,
    nama: r.santri.nama ?? "Tanpa Nama",
    sakan: r.santri.alamat ?? "-", // Kita gunakan sementara alamat sbg fallback lokasi, atau fetch API
    kamar: "-",
    kelasId: r.kelasId,
    kelasNama: r.kelas?.nama ?? null,
    programId: r.programId,
    programNama: r.program?.nama_indo ?? null,
  })).sort((a, b) => a.nama.localeCompare(b.nama, "id"));
}
