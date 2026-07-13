const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const date = new Date("2026-07-13T00:00:00.000Z");
  
  await prisma.absenTabirot.updateMany({
    where: {
      kelompokId: 'cmri1mic10000ry57gav14tuf',
      santriId: '01051100001',
      tanggal: date,
    },
    data: {
      keterangan: "Izin Ta'birot [TRS-20260713-0001]: keluar"
    }
  });

  console.log("Success");
}
main().catch(console.error).finally(() => prisma.$disconnect());
