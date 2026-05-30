const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const riwayats = await prisma.riwayatSantri.findMany({ include: { program: true } });
  const akbarnas = riwayats.filter(r => r.program && r.program.nama_indo.toLowerCase().includes('akbarnas'));
  const santriGroups = {};
  akbarnas.forEach(a => {
    if (!santriGroups[a.santriId]) santriGroups[a.santriId] = [];
    santriGroups[a.santriId].push(a);
  });
  Object.entries(santriGroups).forEach(([id, rList]) => {
    console.log('Santri', id, 'has', rList.length, 'riwayats');
    rList.forEach((r, i) => console.log('  ', i+1, 'Kelas:', r.kelasId, 'Dufah:', r.dufahNama));
  });
}
main().finally(() => process.exit(0));
