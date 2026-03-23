import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const absen = await prisma.absenKelas.findMany({
    orderBy: { tanggal: 'desc' },
    take: 5
  });
  console.log("Recent AbsenKelas records:");
  absen.forEach(a => console.log(a.id, a.tanggal.toISOString(), a.sesi));
}
main().catch(console.error).finally(() => prisma.$disconnect());
