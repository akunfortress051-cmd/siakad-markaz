const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const akbarnasPrograms = await prisma.program.findMany({
    where: { nama_indo: { contains: 'akbarnas', mode: 'insensitive' } },
    select: { id: true }
  });
  const akbarnasIds = akbarnasPrograms.map(p => p.id);
  const res = await prisma.kelas.updateMany({
    where: { programId: { in: akbarnasIds } },
    data: { is_akbarnas_b2: true }
  });
  console.log('Updated classes:', res.count);
}
main().finally(() => process.exit(0));
