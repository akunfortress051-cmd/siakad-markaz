const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const santri = await prisma.santriInternal.findFirst({ where: { nama: { contains: "Ahmad Ibnu Alwan" } } });
  console.log("Santri:", santri.id);
  
  const anggota = await prisma.anggotaTabirot.findFirst({ where: { santriId: santri.id } });
  console.log("Anggota Tabirot:", anggota);
  
  const riwayat = await prisma.riwayatSantri.findFirst({ where: { santriId: santri.id }, orderBy: { dufahNama: "desc" } });
  console.log("Riwayat:", riwayat.id);
  
  const perizinan = await prisma.perizinan.findMany({ where: { riwayatId: riwayat.id }, orderBy: { createdAt: 'desc' }, take: 2 });
  console.log("Perizinan:", perizinan);
  
  const absenTab = await prisma.absenTabirot.findMany({ where: { santriId: santri.id } });
  console.log("Absen Tabirot:", absenTab);
}
main().catch(console.error).finally(() => prisma.$disconnect());
