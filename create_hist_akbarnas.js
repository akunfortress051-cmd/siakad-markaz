const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const akbarnasPrograms = await prisma.program.findMany({
    where: { nama_indo: { contains: 'akbarnas', mode: 'insensitive' } },
    select: { id: true }
  });
  const programIds = akbarnasPrograms.map(p => p.id);

  const activeRiwayats = await prisma.riwayatSantri.findMany({
    where: { programId: { in: programIds } },
    include: { santri: true }
  });

  const activeBySantri = {};
  for (const r of activeRiwayats) {
    if (!activeBySantri[r.santriId] || r.id > activeBySantri[r.santriId].id) {
      activeBySantri[r.santriId] = r;
    }
  }

  let created = 0;
  for (const santriId of Object.keys(activeBySantri)) {
    const current = activeBySantri[santriId];
    
    // Check if they already have multiple riwayats
    const all = await prisma.riwayatSantri.count({
      where: { santriId: santriId, programId: { in: programIds } }
    });

    if (all === 1) {
      // Create historical riwayat for Bulan 1
      let historicalDufah = current.dufahNama;
      // Try to parse number and subtract 1
      const match = historicalDufah.match(/(\d+)/);
      if (match) {
        const num = parseInt(match[1]);
        historicalDufah = historicalDufah.replace(match[1], (num - 1).toString());
      } else {
        historicalDufah = historicalDufah + " (Hist)";
      }

      // Ensure dufah exists
      await prisma.dufah.upsert({
        where: { nama: historicalDufah },
        update: {},
        create: { nama: historicalDufah }
      });

      await prisma.riwayatSantri.create({
        data: {
          santriId: current.santriId,
          dufahNama: historicalDufah,
          programId: current.programId,
          kelasId: current.kelasId,
          is_tasmi: false,
          status_kelulusan: "TIDAK_LULUS"
        }
      });
      created++;
    }
  }
  console.log('Created historical riwayats for', created, 'santris.');
}
main().finally(() => process.exit(0));
