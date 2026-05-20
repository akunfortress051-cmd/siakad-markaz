import { PrismaClient, SesiKelas } from '@prisma/client';

const prisma = new PrismaClient();

const initialJadwal = [
  {
    sesi: SesiKelas.SESI_1,
    label: "Hissoh Ula",
    jamBuka: "05:30",
    jamTutup: "07:00",
    toleransiMenit: 15,
  },
  {
    sesi: SesiKelas.SESI_2,
    label: "Hissoh Tsani",
    jamBuka: "08:00",
    jamTutup: "09:30",
    toleransiMenit: 15,
  },
  {
    sesi: SesiKelas.SESI_3,
    label: "Hissoh Tsalis",
    jamBuka: "10:00",
    jamTutup: "11:30",
    toleransiMenit: 15,
  },
  {
    sesi: SesiKelas.SESI_4,
    label: "Hissoh Robi'",
    jamBuka: "13:30",
    jamTutup: "15:00",
    toleransiMenit: 15,
  },
  {
    sesi: SesiKelas.SESI_5,
    label: "Hissoh Khomis",
    jamBuka: "15:30",
    jamTutup: "17:00",
    toleransiMenit: 15,
  },
  {
    sesi: SesiKelas.SESI_6,
    label: "Hissoh Sodis",
    jamBuka: "20:00",
    jamTutup: "21:30",
    toleransiMenit: 15,
  }
];

async function main() {
  console.log("Seeding Jadwal Sesi...");
  for (const jadwal of initialJadwal) {
    await prisma.jadwalSesi.upsert({
      where: { sesi: jadwal.sesi },
      update: {}, // Jika sudah ada, biarkan apa adanya (mungkin sudah diedit oleh admin)
      create: jadwal,
    });
  }
  console.log("Seeding selesai!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
