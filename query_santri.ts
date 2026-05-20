import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const kelas1 = await prisma.kelas.findUnique({ where: { id: "cmp2zzgh90070c3rz7y7lai5u" } });
  const kelas2 = await prisma.kelas.findUnique({ where: { id: "cmp2zypjc006qc3rz01dlm38v" } });
  console.log("Kelas 1:", kelas1?.nama);
  console.log("Kelas 2:", kelas2?.nama);

  const santri1 = await prisma.riwayatSantri.count({ where: { kelasId: "cmp2zzgh90070c3rz7y7lai5u" } });
  const santri2 = await prisma.riwayatSantri.count({ where: { kelasId: "cmp2zypjc006qc3rz01dlm38v" } });
  console.log("Santri 1:", santri1);
  console.log("Santri 2:", santri2);
}
main().catch(console.error).finally(() => prisma.$disconnect());
