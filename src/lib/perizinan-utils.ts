import prisma from "@/lib/prisma";
import { parseWibDateString, getSesiStatusToday, getAllJadwalSesi } from "@/lib/jadwal-sesi";
import { TipeIzin, SesiKelas, StatusAbsen } from "@prisma/client";

// Generate Nomor Tasrih: TRS-YYYYMMDD-XXXX
export async function generateNomorTasrih(tanggal: Date): Promise<string> {
  const yyyy = tanggal.getFullYear();
  const mm = String(tanggal.getMonth() + 1).padStart(2, "0");
  const dd = String(tanggal.getDate()).padStart(2, "0");
  const datePrefix = `${yyyy}${mm}${dd}`;

  // Cari tasrih terakhir di hari ini
  const lastTasrih = await prisma.perizinan.findFirst({
    where: {
      nomorTasrih: {
        startsWith: `TRS-${datePrefix}-`
      }
    },
    orderBy: {
      nomorTasrih: "desc"
    }
  });

  let counter = 1;
  if (lastTasrih) {
    const lastCounter = parseInt(lastTasrih.nomorTasrih.split("-")[2], 10);
    counter = lastCounter + 1;
  }

  return `TRS-${datePrefix}-${String(counter).padStart(4, "0")}`;
}

export async function processAutoAbsensiIzin(
  riwayatId: string, 
  tipeIzin: TipeIzin, 
  tanggalMulai: Date, 
  tanggalSelesai: Date | null, 
  alasan: string,
  nomorTasrih: string
) {
  const allSesi = await getAllJadwalSesi();
  const sesiList = allSesi.map(s => s.sesi);

  // Helper untuk format keterangan
  const keterangan = tipeIzin === "HARIAN" ? `Izin Harian [${nomorTasrih}]: ${alasan}` : 
                     tipeIzin === "BERHARI_HARI" ? `Izin Berhari-hari [${nomorTasrih}]: ${alasan}` :
                     `Izin Keluar Pare [${nomorTasrih}]: ${alasan}`;

  // Tentukan range tanggal
  const datesToProcess: Date[] = [];
  if (tipeIzin === "HARIAN" || tipeIzin === "KELUAR_PARE") {
    datesToProcess.push(tanggalMulai);
  } else if (tipeIzin === "BERHARI_HARI" && tanggalSelesai) {
    let currentDate = new Date(tanggalMulai);
    while (currentDate <= tanggalSelesai) {
      datesToProcess.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  // Lakukan proses untuk setiap hari
  for (const date of datesToProcess) {
    // 1. Absen Kelas (semua sesi)
    const kelasOps = sesiList.map(sesi => 
      prisma.absenKelas.upsert({
        where: { riwayatId_tanggal_sesi: { riwayatId, tanggal: date, sesi } },
        update: { status: "IZIN", keterangan },
        create: { riwayatId, tanggal: date, sesi, status: "IZIN", keterangan }
      })
    );
    await prisma.$transaction(kelasOps);

    // 2. Absen Sakan (Hanya untuk tipe Berhari-hari dan Keluar Pare)
    if (tipeIzin === "BERHARI_HARI" || tipeIzin === "KELUAR_PARE") {
      await prisma.absenSakan.upsert({
        where: { riwayatId_tanggal: { riwayatId, tanggal: date } },
        update: { status: "IZIN", keterangan },
        create: { riwayatId, tanggal: date, status: "IZIN", keterangan }
      });

      // 3. Absen Kegiatan (Yang sudah ada diabsen diubah jadi IZIN, atau auto isi untuk semua kategori aktif)
      // Ambil semua kategori aktif
      const kategoriAktif = await prisma.kategoriKegiatan.findMany({ where: { aktif: true } });
      const kegiatanOps = kategoriAktif.map(kat => 
        prisma.absenKegiatan.upsert({
          where: { riwayatId_kategoriId_tanggal: { riwayatId, tanggal: date, kategoriId: kat.id } },
          update: { status: "IZIN", keterangan },
          create: { riwayatId, tanggal: date, kategoriId: kat.id, status: "IZIN", keterangan }
        })
      );
      await prisma.$transaction(kegiatanOps);
    }
  }
}

export async function rollbackAutoAbsensiIzin(nomorTasrih: string) {
  // Hapus semua absensi yang keterangannya mengandung nomor tasrih ini
  const searchKeterangan = { contains: `[${nomorTasrih}]` };
  
  await prisma.$transaction([
    prisma.absenKelas.deleteMany({ where: { keterangan: searchKeterangan } }),
    prisma.absenSakan.deleteMany({ where: { keterangan: searchKeterangan } }),
    prisma.absenKegiatan.deleteMany({ where: { keterangan: searchKeterangan } }),
  ]);
}
