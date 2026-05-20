import prisma from "./prisma";
import { SesiKelas } from "@prisma/client";

const TIMEZONE = "Asia/Jakarta";

/**
 * Returns today's date formatted as "YYYY-MM-DD" in WIB (Asia/Jakarta)
 */
export function getTodayWibString(): string {
  const now = new Date();
  const wibTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
  return wibTime.toISOString().split("T")[0];
}

/**
 * Parses a YYYY-MM-DD string into a UTC Midnight Date object.
 * Karena schema Prisma menggunakan @db.Date, semua waktu (jam) akan dipotong oleh PostgreSQL.
 * Jika kita gunakan +07:00, 27 Maret 00:00 WIB akan dieksekusi sebagai 26 Maret 17:00 UTC,
 * dan PostgreSQL akan menyimpan 26 Maret. Oleh karena itu kita paksa simpan sebagai UTC.
 */
export function parseWibDateString(dateString: string): Date {
  return new Date(`${dateString}T00:00:00Z`);
}

/**
 * Format WIB hour from Date (HH:mm)
 */
export function getCurrentWibTime(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("id-ID", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
  return formatter.format(now).replace(".", ":"); // e.g. "05:30"
}

function parseTimeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Get all JadwalSesi from database
 */
export async function getAllJadwalSesi() {
  return prisma.jadwalSesi.findMany({
    orderBy: { sesi: "asc" }
  });
}

export type SesiStatusInfo = {
  sesi: SesiKelas;
  label: string;
  isOpen: boolean;
  isUpcoming: boolean;
  isPassed: boolean;
  jamBuka: string;
  jamTutup: string;
  waktuTutupDenganToleransi: string;
};

/**
 * Get the status of all sessions for today based on current WIB time.
 */
export async function getSesiStatusToday(): Promise<SesiStatusInfo[]> {
  const jadwalList = await getAllJadwalSesi();
  const currentWibTime = getCurrentWibTime();
  const currentMinutes = parseTimeToMinutes(currentWibTime);

  return jadwalList.map((jadwal) => {
    const bukaMinutes = parseTimeToMinutes(jadwal.jamBuka);
    const tutupMinutes = parseTimeToMinutes(jadwal.jamTutup) + jadwal.toleransiMenit;

    const waktuTutupDenganToleransi = `${String(Math.floor(tutupMinutes / 60)).padStart(2, '0')}:${String(tutupMinutes % 60).padStart(2, '0')}`;

    let isOpen = false;
    let isUpcoming = false;
    let isPassed = false;

    if (!jadwal.isActive) {
      isPassed = true; // Anggap lewat jika tidak aktif
    } else if (currentMinutes >= bukaMinutes && currentMinutes <= tutupMinutes) {
      isOpen = true;
    } else if (currentMinutes < bukaMinutes) {
      isUpcoming = true;
    } else {
      isPassed = true;
    }

    return {
      sesi: jadwal.sesi,
      label: jadwal.label,
      isOpen,
      isUpcoming,
      isPassed,
      jamBuka: jadwal.jamBuka,
      jamTutup: jadwal.jamTutup,
      waktuTutupDenganToleransi
    };
  });
}

/**
 * Determine which session is currently active based on WIB time.
 * Returns null if no session is active.
 */
export async function getCurrentActiveSesi(): Promise<SesiKelas | null> {
  const statuses = await getSesiStatusToday();
  const activeStatus = statuses.find(s => s.isOpen);
  return activeStatus ? activeStatus.sesi : null;
}
