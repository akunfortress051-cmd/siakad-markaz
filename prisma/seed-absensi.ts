import { PrismaClient, StatusAbsen, SesiKelas } from "@prisma/client";

const prisma = new PrismaClient();

function getNaturalStatus(baseOptions?: { sakit?: boolean; izin?: boolean }): StatusAbsen {
  // Jika sedang sakit atau izin di asrama, maka di kelas/kegiatan juga sama
  if (baseOptions?.sakit) return StatusAbsen.SAKIT;
  if (baseOptions?.izin) return StatusAbsen.IZIN;

  const rand = Math.random();
  // 85% Hadir, 5% Sakit, 5% Izin, 5% Alpha
  if (rand < 0.85) return StatusAbsen.HADIR;
  if (rand < 0.90) return StatusAbsen.SAKIT;
  if (rand < 0.95) return StatusAbsen.IZIN;
  return StatusAbsen.ALPHA;
}

async function main() {
  const allRiwayat = await prisma.riwayatSantri.findMany();
  
  if (allRiwayat.length === 0) {
    console.log("⚠️ TIDAK ADA DATA SANTRI (RiwayatSantri) DI DATABASE.");
    console.log("Pastikan Anda sudah menambahkan santri ke kelas terlebih dahulu melalui aplikasi, atau jalankan seeder yang memasukkan data RiwayatSantri.");
    return;
  }

  // Cari atau buat kategori kegiatan
  let kegiatanList = await prisma.kategoriKegiatan.findMany();
  if (kegiatanList.length === 0) {
    kegiatanList.push(await prisma.kategoriKegiatan.create({ data: { nama: "Muhadharah" } }));
    kegiatanList.push(await prisma.kategoriKegiatan.create({ data: { nama: "Kerja Bakti" } }));
  }

  const sakanInput: any[] = [];
  const kelasInput: any[] = [];
  const kegiatanInput: any[] = [];

  const today = new Date();

  console.log(`Mulai memproses absensi untuk ${allRiwayat.length} santri selama 30 hari ke belakang...`);

  // Loop 30 hari ke belakang
  for (let d = 0; d < 30; d++) {
    const date = new Date(today);
    date.setDate(date.getDate() - d);
    date.setHours(0, 0, 0, 0); // Pastikan waktu di set ke 00:00:00

    for (const rw of allRiwayat) {
      // Tentukan status asrama hari ini
      const sakanStatus = getNaturalStatus();
      const isSakit = sakanStatus === StatusAbsen.SAKIT;
      const isIzin = sakanStatus === StatusAbsen.IZIN;

      sakanInput.push({
        riwayatId: rw.id,
        tanggal: date,
        status: sakanStatus,
      });

      // Absen 6 Sesi Kelas (mengikuti status asrama jika sakit/izin)
      const sesiList = [SesiKelas.SESI_1, SesiKelas.SESI_2, SesiKelas.SESI_3, SesiKelas.SESI_4, SesiKelas.SESI_5, SesiKelas.SESI_6];
      for (const sesi of sesiList) {
        // Jika asrama Hadir/Alpha, kelas punya probabilitas sendiri (tapi lebih sering hadir)
        let kelasStatus = sakanStatus;
        if (!isSakit && !isIzin) {
           // Jika di asrama Alpha, mungkin di kelas juga Alpha. Jika Hadir, 95% hadir di kelas.
           if (sakanStatus === StatusAbsen.ALPHA) {
              kelasStatus = Math.random() > 0.5 ? StatusAbsen.ALPHA : StatusAbsen.HADIR;
           } else {
              kelasStatus = Math.random() > 0.05 ? StatusAbsen.HADIR : StatusAbsen.ALPHA;
           }
        }

        kelasInput.push({
          riwayatId: rw.id,
          tanggal: date,
          sesi,
          status: kelasStatus,
        });
      }

      // Absen Kegiatan (ambil 1 kegiatan per hari secara acak)
      const randomKegiatan = kegiatanList[Math.floor(Math.random() * kegiatanList.length)];
      let kegiatanStatus = sakanStatus;
      if (!isSakit && !isIzin) {
        kegiatanStatus = Math.random() > 0.1 ? StatusAbsen.HADIR : StatusAbsen.ALPHA;
      }

      kegiatanInput.push({
        riwayatId: rw.id,
        tanggal: date,
        kategoriId: randomKegiatan.id,
        status: kegiatanStatus,
      });
    }
  }

  // Hapus data lama (opsional, agar tidak konflik)
  console.log("Menghapus data absensi lama agar data baru fresh...");
  await prisma.absenSakan.deleteMany();
  await prisma.absenKelas.deleteMany();
  await prisma.absenKegiatan.deleteMany();

  console.log("Menyimpan data Absen Sakan...");
  await prisma.absenSakan.createMany({ data: sakanInput, skipDuplicates: true });

  console.log("Menyimpan data Absen Kelas...");
  await prisma.absenKelas.createMany({ data: kelasInput, skipDuplicates: true });

  console.log("Menyimpan data Absen Kegiatan...");
  await prisma.absenKegiatan.createMany({ data: kegiatanInput, skipDuplicates: true });

  console.log("✅ Berhasil membuat data absensi natural untuk 30 hari!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
