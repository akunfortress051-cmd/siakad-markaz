const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const kelas = await prisma.kelas.findUnique({where: {nama: 'Akbarnas KSU'}});
  console.log(kelas);
  const riwayats = await prisma.riwayatSantri.findMany({where: {kelasId: kelas.id}});
  console.log('Riwayats for Akbarnas KSU:', riwayats.length);
  riwayats.forEach(r => console.log(r.santriId, r.dufahNama));
}
main().finally(() => process.exit(0));
