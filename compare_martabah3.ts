import { PrismaClient } from '@prisma/client'
import { calcAkumulatif, applyNilaiTambahan } from './src/lib/grade-calculator'
const prisma = new PrismaClient()

async function main() {
  const riwayatList = await prisma.riwayatSantri.findMany({
    where: {
      status_kelulusan: { not: "TIDAK_LULUS" },
      dufahNama: "Duf'ah 90" // current dufah
    },
    include: {
      santri: true,
      nilaiList: true,
      program: { include: { programMapels: { include: { mapel: true } } } }
    },
    orderBy: { santri: { nama: 'asc' } }
  });

  const validRiwayats = riwayatList.filter(r => {
    let missingMapel = 0;
    for (const pm of r.program!.programMapels) {
      if (pm.mapel.masuk_akumulasi !== false) {
        const active = r.nilaiList.find(n => n.mapelId === pm.mapelId);
        if (!active || active.nilaiAkhir === null) {
          missingMapel++;
        }
      }
    }
    return missingMapel === 0;
  });

  // UI LOGIC
  const byProgram = new Map();
  for (const r of validRiwayats) {
    if (!byProgram.has(r.programId)) byProgram.set(r.programId, []);
    const accItems = [];
    for (const pm of r.program!.programMapels) {
      if (pm.mapel.masuk_akumulasi !== false) {
        const active = r.nilaiList.find(n => n.mapelId === pm.mapelId);
        const score = applyNilaiTambahan(active?.nilaiAkhir || 0, active?.nilaiTambahan || 0);
        accItems.push({ score, bobot: pm.mapel.bobot ?? 1 });
      }
    }
    const avg = calcAkumulatif(accItems);
    byProgram.get(r.programId).push({ id: r.id, name: r.santri.nama, avg });
  }

  const uiTop = [];
  for (const students of byProgram.values()) {
    students.sort((a,b) => b.avg - a.avg);
    if(students.length > 0) uiTop.push(students[0]);
  }

  // CERT LOGIC (what checkMartabahUla does exactly now)
  const certTop = [];
  for (const students of byProgram.values()) {
    let highest = -1;
    let topId = null;
    let topName = null;
    // Since checkMartabahUla uses findMany without orderBy, we shuffle to simulate random order or loop as is
    for (const r of students) {
        if (r.avg > highest) {
            highest = r.avg;
            topId = r.id;
            topName = r.name;
        }
    }
    certTop.push({ id: topId, name: topName, avg: highest });
  }

  for (let i = 0; i < uiTop.length; i++) {
    const u = uiTop[i];
    const c = certTop.find(x => x.id === u.id);
    if (!c) {
       console.log(`Mismatch! UI top: ${u.name} (${u.avg}). But Cert top: ${certTop[i].name} (${certTop[i].avg})`);
    } else {
       console.log(`Match: ${u.name} = ${u.avg}`);
    }
  }
}
main().catch(console.error).then(() => prisma.$disconnect());
