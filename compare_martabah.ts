import { PrismaClient } from '@prisma/client'
import { calcAkumulatif, applyNilaiTambahan } from './src/lib/grade-calculator'
const prisma = new PrismaClient()

async function main() {
  const p = await prisma.program.findMany();
  
  // 1. Emulate MartabahUlaClient logic
  const riwayatList = await prisma.riwayatSantri.findMany({
    where: { status_kelulusan: { not: "TIDAK_LULUS" } },
    include: {
      santri: true,
      nilaiList: true,
      program: { include: { programMapels: { include: { mapel: true } } } }
    }
  });

  const validRiwayat = riwayatList.filter(r => {
    if (!r.program) return false;
    let missing = 0;
    for (const pm of r.program.programMapels) {
      if (pm.mapel.masuk_akumulasi !== false) {
        const active = r.nilaiList.find(n => n.mapelId === pm.mapelId);
        if (!active || active.nilaiAkhir === null) missing++;
      }
    }
    return missing === 0;
  });

  const byProgramDufah = new Map<string, any[]>();
  for (const r of validRiwayat) {
    const key = `${r.programId}_${r.dufahNama}`;
    if (!byProgramDufah.has(key)) byProgramDufah.set(key, []);
    
    const accItems = r.nilaiList
      .filter(n => {
         const pm = r.program?.programMapels.find(x => x.mapelId === n.mapelId);
         return pm?.mapel.masuk_akumulasi !== false;
      })
      .map(n => {
        const pm = r.program?.programMapels.find(x => x.mapelId === n.mapelId);
        return {
          score: applyNilaiTambahan(n.nilaiAkhir || 0, n.nilaiTambahan || 0),
          bobot: pm?.mapel.bobot ?? 1
        };
      });
    const avg = calcAkumulatif(accItems);
    byProgramDufah.get(key)!.push({ ...r, avg });
  }

  const clientTop = new Set<string>();
  for (const [key, students] of byProgramDufah.entries()) {
    students.sort((a,b) => b.avg - a.avg);
    if(students.length > 0) {
      clientTop.add(students[0].id);
    }
  }

  // 2. Emulate checkMartabahUla logic
  const checkTop = new Set<string>();
  for (const [key, students] of byProgramDufah.entries()) {
    // For each program/dufah cohort, let's run the check logic
    const progId = key.split('_')[0];
    const dufah = key.split('_')[1];
    
    let highest = -1;
    let topId = null;
    const dbRiwayats = validRiwayat.filter(r => r.programId === progId && r.dufahNama === dufah);
    
    for (const r of dbRiwayats) {
       const totalMapel = r.program?.programMapels.length || 0;
       if (totalMapel === 0 || r.nilaiList.length < totalMapel) continue;
       
       const accItems = [];
       for (const n of r.nilaiList) {
         const pm = r.program?.programMapels.find(p => p.mapelId === n.mapelId);
         if (!pm || pm.mapel.masuk_akumulasi === false) continue;
         if (n.nilaiAkhir === null) continue;
         accItems.push({
           score: applyNilaiTambahan(n.nilaiAkhir, n.nilaiTambahan || 0),
           bobot: pm.mapel.bobot ?? 1
         });
       }
       const avg = calcAkumulatif(accItems);
       if (avg > highest) {
         highest = avg;
         topId = r.id;
       }
    }
    if (topId) checkTop.add(topId);
  }

  console.log("Client Top Count:", clientTop.size);
  console.log("Check Top Count:", checkTop.size);

  for (const id of clientTop) {
    if (!checkTop.has(id)) {
      const r = riwayatList.find(x => x.id === id);
      console.log(`Mismatch! ID: ${id}, Name: ${r?.santri.nama}, Program: ${r?.program?.nama_indo}, Dufah: ${r?.dufahNama}`);
      console.log(`NilaiList length: ${r?.nilaiList.length}, Total Mapels: ${r?.program?.programMapels.length}`);
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
