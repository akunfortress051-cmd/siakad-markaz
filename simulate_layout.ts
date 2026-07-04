import { PrismaClient } from '@prisma/client'
import { saveLayout, getLayoutForRiwayat } from './src/lib/syahadah-layout'
const prisma = new PrismaClient()

async function main() {
  const rs = await prisma.riwayatSantri.findFirst({
    where: { status_kelulusan: "LULUS" },
    include: { santri: true }
  })
  if (!rs) return console.log("No riwayat");
  
  console.log(`Testing for riwayatId: ${rs.id} (${rs.santri.nama}) programId: ${rs.programId}`)

  // 1. Fetch initial
  const initial = await getLayoutForRiwayat(rs.id, rs.programId!);
  
  // 2. Modify one coordinate
  const newLayout = {
    ...initial,
    namaSantri: { ...initial.namaSantri, offsetX: 50, offsetY: 100 }
  }

  // 3. Save
  await saveLayout({ riwayatId: rs.id, programId: null }, newLayout as any);
  console.log("Saved per-santri layout");

  // 4. Fetch again (this represents what happens when we print)
  const reFetched = await getLayoutForRiwayat(rs.id, rs.programId!);
  
  console.log("Re-fetched namaSantri offset:", reFetched.namaSantri.offsetX, reFetched.namaSantri.offsetY);
  
  // Check the DB record
  const dbRecord = await prisma.syahadahLayout.findUnique({
      where: { riwayatId: rs.id }
  });
  const dbLayout = dbRecord?.layoutData as any;
  console.log("DB layout data namaSantri offset:", dbLayout?.namaSantri?.offsetX, dbLayout?.namaSantri?.offsetY);
}
main().catch(console.error).finally(() => prisma.$disconnect());
