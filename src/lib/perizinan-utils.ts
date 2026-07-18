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
  nomorTasrih: string,
  statusAbsen: "IZIN" | "SAKIT" = "IZIN",
  kategoriHarian?: string
) {
  const allSesi = await getAllJadwalSesi();
  const sesiList: SesiKelas[] = allSesi.map(s => s.sesi);

  // Juga ambil sesi tambahan dari program santri
  const riwayat = await prisma.riwayatSantri.findUnique({
    where: { id: riwayatId },
    select: { programId: true }
  });
  if (riwayat?.programId) {
    const sesiTambahan = await prisma.sesiTambahanProgram.findMany({
      where: { programId: riwayat.programId, isActive: true }
    });
    for (const st of sesiTambahan) {
      if (!sesiList.includes(st.sesi)) {
        sesiList.push(st.sesi);
      }
    }
  }

  // Helper untuk format keterangan
  const keterangan = tipeIzin === "HARIAN" && kategoriHarian === "KEGIATAN" ? `Izin Kegiatan [${nomorTasrih}]: ${alasan}` : 
                     tipeIzin === "HARIAN" ? `Izin Harian [${nomorTasrih}]: ${alasan}` : 
                     tipeIzin === "BERHARI_HARI" ? `Izin Berhari-hari [${nomorTasrih}]: ${alasan}` :
                     (tipeIzin as any) === "TABIROT" ? `Izin Ta'birot [${nomorTasrih}]: ${alasan}` :
                     `Izin Keluar Pare [${nomorTasrih}]: ${alasan}`;

  // Tentukan range tanggal
  const datesToProcess: Date[] = [];
  if (tipeIzin === "HARIAN" || tipeIzin === "KELUAR_PARE" || (tipeIzin as any) === "TABIROT") {
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
    // 1. Absen Kelas (semua sesi termasuk sesi tambahan, kecuali Tabirot dan Kegiatan)
    if ((tipeIzin as any) !== "TABIROT" && kategoriHarian !== "KEGIATAN") {
      for (const sesi of sesiList) {
        const existingKelas = await prisma.absenKelas.findUnique({
          where: { riwayatId_tanggal_sesi: { riwayatId, tanggal: date, sesi } }
        });
        if (!existingKelas || existingKelas.status !== "HADIR") {
          await prisma.absenKelas.upsert({
            where: { riwayatId_tanggal_sesi: { riwayatId, tanggal: date, sesi } },
            update: { status: statusAbsen, keterangan },
            create: { riwayatId, tanggal: date, sesi, status: statusAbsen, keterangan }
          });
        }
      }
    }

    // 2. Absen Sakan (Hanya untuk tipe Berhari-hari dan Keluar Pare)
    if (tipeIzin === "BERHARI_HARI" || tipeIzin === "KELUAR_PARE") {
      const existingSakan = await prisma.absenSakan.findUnique({
        where: { riwayatId_tanggal: { riwayatId, tanggal: date } }
      });
      if (!existingSakan || existingSakan.status !== "HADIR") {
        await prisma.absenSakan.upsert({
          where: { riwayatId_tanggal: { riwayatId, tanggal: date } },
          update: { status: statusAbsen, keterangan },
          create: { riwayatId, tanggal: date, status: statusAbsen, keterangan }
        });
      }
    }

    // 3. Absen Kegiatan (Yang sudah ada diabsen diubah jadi IZIN/SAKIT, atau auto isi untuk semua kategori aktif)
    if (tipeIzin === "BERHARI_HARI" || tipeIzin === "KELUAR_PARE" || (tipeIzin === "HARIAN" && kategoriHarian === "KEGIATAN")) {
      const kategoriAktif = await prisma.kategoriKegiatan.findMany({ where: { aktif: true } });
      for (const kat of kategoriAktif) {
        const existingKegiatan = await prisma.absenKegiatan.findUnique({
          where: { riwayatId_kategoriId_tanggal: { riwayatId, tanggal: date, kategoriId: kat.id } }
        });
        if (!existingKegiatan || existingKegiatan.status !== "HADIR") {
          await prisma.absenKegiatan.upsert({
            where: { riwayatId_kategoriId_tanggal: { riwayatId, tanggal: date, kategoriId: kat.id } },
            update: { status: statusAbsen, keterangan },
            create: { riwayatId, tanggal: date, kategoriId: kat.id, status: statusAbsen, keterangan }
          });
        }
      }
    }

    // 4. Absen Ta'birot (Untuk tipe Tabirot, Berhari-hari, Keluar Pare)
    if ((tipeIzin as any) === "TABIROT" || tipeIzin === "BERHARI_HARI" || tipeIzin === "KELUAR_PARE") {
      const rws = await prisma.riwayatSantri.findUnique({ where: { id: riwayatId }, select: { santriId: true } });
      if (rws?.santriId) {
        // Cari kelompok tabirot yang aktif
        const anggota = await prisma.anggotaTabirot.findFirst({
          where: { santriId: rws.santriId, kelompok: { isActive: true } }
        });
        if (anggota) {
          const existingTabirot = await prisma.absenTabirot.findUnique({
            where: { kelompokId_santriId_tanggal: { kelompokId: anggota.kelompokId, santriId: rws.santriId, tanggal: date } }
          });
          if (!existingTabirot || existingTabirot.status !== "HADIR") {
            await prisma.absenTabirot.upsert({
              where: { kelompokId_santriId_tanggal: { kelompokId: anggota.kelompokId, santriId: rws.santriId, tanggal: date } },
              update: { status: statusAbsen, keterangan },
              create: { kelompokId: anggota.kelompokId, santriId: rws.santriId, tanggal: date, status: statusAbsen, keterangan }
            });
          }
        }
      }
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
    prisma.absenTabirot.deleteMany({ where: { keterangan: searchKeterangan } }),
  ]);
}
