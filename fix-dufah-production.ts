/**
 * SCRIPT FIX DATA DUFAH - JALANKAN DI SERVER PRODUKSI
 * 
 * Cara pakai:
 *   1. Upload file ini ke server produksi (folder project)
 *   2. Jalankan: npx tsx fix-dufah-production.ts
 *   3. Hapus file setelah selesai: rm fix-dufah-production.ts
 * 
 * Pastikan .env di server sudah mengarah ke database produksi.
 */

import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  console.log('========================================');
  console.log('  FIX DUFAH RENAME - PRODUCTION SCRIPT  ');
  console.log('========================================\n');

  // === CHECK CURRENT STATE ===
  const before = await p.riwayatSantri.groupBy({
    by: ['dufahNama'],
    _count: true,
    orderBy: { _count: { dufahNama: 'desc' } }
  });
  console.log('STATE SEBELUM FIX:');
  for (const b of before) {
    console.log(`  ${b.dufahNama}: ${b._count} riwayat`);
  }
  console.log('');

  // === FIX 1: Dufah 91 (Juli 2026) -> Dufah 91 ===
  const old91 = await p.riwayatSantri.findMany({
    where: { dufahNama: 'Dufah 91 (Juli 2026)' },
    select: { id: true, santriId: true }
  });
  const new91 = await p.riwayatSantri.findMany({
    where: { dufahNama: 'Dufah 91' },
    select: { id: true, santriId: true }
  });

  if (old91.length > 0) {
    const new91Set = new Set(new91.map(r => r.santriId));
    
    // Hapus riwayat BARU yang kosong (duplikat) jika santri sudah ada di OLD
    const emptyDupes = new91.filter(r => old91.some(o => o.santriId === r.santriId));
    if (emptyDupes.length > 0) {
      await p.riwayatSantri.deleteMany({ where: { id: { in: emptyDupes.map(r => r.id) } } });
      console.log(`[Dufah 91] Hapus ${emptyDupes.length} riwayat duplikat kosong`);
    }

    // Rename semua riwayat lama ke nama baru
    const renamed91 = await p.riwayatSantri.updateMany({
      where: { dufahNama: 'Dufah 91 (Juli 2026)' },
      data: { dufahNama: 'Dufah 91' }
    });
    console.log(`[Dufah 91] Rename ${renamed91.count} riwayat dari "Dufah 91 (Juli 2026)" -> "Dufah 91"`);
  } else {
    console.log('[Dufah 91] Tidak ada riwayat lama yang perlu diperbaiki.');
  }

  // === FIX 2: Duf'ah 90 (Juni 2026) -> Duf'ah 90 ===
  const old90 = await p.riwayatSantri.findMany({
    where: { dufahNama: "Duf'ah 90 (Juni 2026)" },
    select: { id: true, santriId: true }
  });

  if (old90.length > 0) {
    const new90 = await p.riwayatSantri.findMany({
      where: { dufahNama: "Duf'ah 90" },
      select: { santriId: true }
    });
    const new90Set = new Set(new90.map(r => r.santriId));

    // Hapus riwayat lama yang sudah ada di baru (duplikat)
    const dupes90 = old90.filter(r => new90Set.has(r.santriId));
    if (dupes90.length > 0) {
      await p.riwayatSantri.deleteMany({ where: { id: { in: dupes90.map(r => r.id) } } });
      console.log(`[Duf'ah 90] Hapus ${dupes90.length} riwayat duplikat`);
    }

    // Rename sisanya
    const renamed90 = await p.riwayatSantri.updateMany({
      where: { dufahNama: "Duf'ah 90 (Juni 2026)" },
      data: { dufahNama: "Duf'ah 90" }
    });
    console.log(`[Duf'ah 90] Rename ${renamed90.count} riwayat`);
  } else {
    console.log("[Duf'ah 90] Tidak ada riwayat lama yang perlu diperbaiki.");
  }

  // === FIX 3: SantriInternal.dufahNama ===
  const f1 = await p.santriInternal.updateMany({
    where: { dufahNama: 'Dufah 91 (Juli 2026)' },
    data: { dufahNama: 'Dufah 91' }
  });
  const f2 = await p.santriInternal.updateMany({
    where: { dufahNama: "Duf'ah 90 (Juni 2026)" },
    data: { dufahNama: "Duf'ah 90" }
  });
  if (f1.count + f2.count > 0) {
    console.log(`[SantriInternal] Fix ${f1.count + f2.count} referensi dufahNama`);
  }

  // === FIX 4: Hapus dufah orphan ===
  try {
    await p.dufah.deleteMany({
      where: { nama: { in: ["Dufah 91 (Juli 2026)", "Duf'ah 90 (Juni 2026)"] } }
    });
    console.log('[Dufah Table] Entry orphan dihapus');
  } catch {
    console.log('[Dufah Table] Tidak bisa hapus (mungkin masih ada FK refs, skip)');
  }

  // === FINAL CHECK ===
  console.log('\n========================================');
  console.log('  STATE SETELAH FIX:');
  console.log('========================================');
  const after = await p.riwayatSantri.groupBy({
    by: ['dufahNama'],
    _count: true,
    orderBy: { _count: { dufahNama: 'desc' } }
  });
  for (const a of after) {
    console.log(`  ${a.dufahNama}: ${a._count} riwayat`);
  }
  console.log('\nDone! Silakan hapus file ini: rm fix-dufah-production.ts');
}

main().catch(e => console.error('ERROR:', e)).finally(() => p.$disconnect());
