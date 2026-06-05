import { requirePermission } from "@/lib/permission";
import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { TranskripDocument } from "@/components/admin/transkrip-document";
import { getMasterSantriById } from "@/lib/santri-api";

export default async function TranskripPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("cetak_transkrip");
  const { id } = await params;

  const riwayatMatch = await prisma.riwayatSantri.findUnique({
    where: { id },
    include: { santri: true, program: { include: { programMapels: { include: { mapel: true }, orderBy: { urutan: 'asc' } } } } }
  });

  let santriIdToFetch = id;
  let activeRiwayat = riwayatMatch;

  if (!riwayatMatch) {
    const masterSantri = await getMasterSantriById(id);
    if (!masterSantri) notFound();
    santriIdToFetch = masterSantri.id;
    activeRiwayat = await prisma.riwayatSantri.findUnique({
      where: { santriId_dufahNama: { santriId: masterSantri.id, dufahNama: masterSantri.dufahNama } },
      include: { santri: true, program: { include: { programMapels: { include: { mapel: true }, orderBy: { urutan: 'asc' } } } } }
    });
  } else {
    santriIdToFetch = riwayatMatch.santriId;
  }

  if (!activeRiwayat || !activeRiwayat.program) {
    return <div className="p-8 text-center text-rose-600 font-bold">Data program belum lengkap.</div>;
  }

  const santriName = activeRiwayat.santri.nama ?? "Tanpa Nama";
  const programName = activeRiwayat.program.nama_indo;
  const isAkbarnas = programName.toLowerCase().includes("akbarnas");

  // Fetch all riwayats (Bulan 1 and Bulan 2 if Akbarnas)
  const riwayats = await prisma.riwayatSantri.findMany({
    where: {
      santriId: santriIdToFetch,
      program: isAkbarnas ? { nama_indo: { contains: "akbarnas", mode: "insensitive" } } : { id: activeRiwayat.program.id }
    },
    include: { nilaiList: true },
    orderBy: { dufahNama: 'asc' }
  });

  const b1Riwayat = riwayats[0];
  const b2Riwayat = riwayats.length > 1 ? riwayats[1] : null;

  const items = [];

  for (const pm of activeRiwayat.program.programMapels) {
    const m = pm.mapel;
    
    // Get values from B1
    const n1 = b1Riwayat ? b1Riwayat.nilaiList.find((x: any) => x.mapelId === m.id) : null;
    const jtB1 = m.jumlah_tes ?? 3;
    let b1_n = n1?.nilaiNihai ?? null;
    if (jtB1 === 1 && b1_n === null && n1?.nilaiAkhir !== null && n1?.nilaiAkhir !== undefined) {
      b1_n = n1.nilaiAkhir;
    }
    const b1 = {
      u1: n1?.nilaiUsbu1 ?? null,
      u2: n1?.nilaiUsbu2 ?? null,
      n: b1_n,
    };

    // Get values from B2
    const n2 = b2Riwayat ? b2Riwayat.nilaiList.find((x: any) => x.mapelId === m.id) : null;
    const jtB2 = m.jumlah_tes_b2 ?? jtB1;
    let b2_n = n2?.nilaiNihai ?? null;
    if (jtB2 === 1 && b2_n === null && n2?.nilaiAkhir !== null && n2?.nilaiAkhir !== undefined) {
      b2_n = n2.nilaiAkhir;
    }
    const b2 = {
      u1: n2?.nilaiUsbu1 ?? null,
      u2: n2?.nilaiUsbu2 ?? null,
      n: b2_n,
    };

    // Calculate Nilai Akhir Mapel - prioritize DB stored nilaiAkhir for consistency
    const allWeeklyB1: number[] = [];
    if (b1.u1 !== null && b1.u1 !== undefined) allWeeklyB1.push(b1.u1);
    if (b1.u2 !== null && b1.u2 !== undefined) allWeeklyB1.push(b1.u2);
    if (b1.n !== null && b1.n !== undefined) allWeeklyB1.push(b1.n);
    const b1Avg = allWeeklyB1.length > 0 ? Number((allWeeklyB1.reduce((a, b) => a + b, 0) / allWeeklyB1.length).toFixed(2)) : null;

    const allWeeklyB2: number[] = [];
    if (b2.u1 !== null && b2.u1 !== undefined) allWeeklyB2.push(b2.u1);
    if (b2.u2 !== null && b2.u2 !== undefined) allWeeklyB2.push(b2.u2);
    if (b2.n !== null && b2.n !== undefined) allWeeklyB2.push(b2.n);
    const b2Avg = allWeeklyB2.length > 0 ? Number((allWeeklyB2.reduce((a, b) => a + b, 0) / allWeeklyB2.length).toFixed(2)) : null;

    // Use stored nilaiAkhir from DB when available (same as input-nilai page)
    // This ensures consistency between pages
    let nilaiAkhir: number | null = null;

    if (isAkbarnas) {
      // Akbarnas: average nilaiAkhir from both B1 and B2 riwayats
      const dbScores: number[] = [];
      if (n1 && n1.nilaiAkhir !== null && n1.nilaiAkhir !== undefined) dbScores.push(n1.nilaiAkhir);
      if (n2 && n2.nilaiAkhir !== null && n2.nilaiAkhir !== undefined) dbScores.push(n2.nilaiAkhir);
      if (dbScores.length > 0) {
        nilaiAkhir = Number((dbScores.reduce((a, b) => a + b, 0) / dbScores.length).toFixed(2));
      }
    } else {
      // Non-Akbarnas: use the single riwayat's nilaiAkhir
      if (n1 && n1.nilaiAkhir !== null && n1.nilaiAkhir !== undefined) {
        nilaiAkhir = n1.nilaiAkhir;
      }
    }

    // Fallback: recalculate from raw scores if DB nilaiAkhir is not set
    if (nilaiAkhir === null) {
      const allWeekly = [...allWeeklyB1, ...allWeeklyB2];
      if (allWeekly.length > 0) {
        nilaiAkhir = Number((allWeekly.reduce((a, b) => a + b, 0) / allWeekly.length).toFixed(2));
      }
    }

    // Add nilaiTambahan (bonus points from teacher)
    let tambahan = 0;
    if (n2 && (n2 as any).nilaiTambahan > 0) {
      tambahan = (n2 as any).nilaiTambahan;
    } else if (n1 && (n1 as any).nilaiTambahan > 0) {
      tambahan = (n1 as any).nilaiTambahan;
    }
    if (nilaiAkhir !== null && tambahan > 0) {
      nilaiAkhir = Math.min(100, nilaiAkhir + tambahan);
    }

    items.push({
      mapel: m.nama_indo,
      bobot: m.bobot ?? 1,
      bobotUsbu: (m as any).bobot_usbu ?? 1,
      masukAkumulasi: m.masuk_akumulasi ?? true,
      b1: { ...b1, avg: b1Avg },
      b2: { ...b2, avg: b2Avg },
      nilaiAkhir
    });
  }

  // Calculate Grand Average
  let totalBobot = 0;
  let totalSkorBobot = 0;
  for (const item of items) {
    if (item.masukAkumulasi && item.nilaiAkhir !== null) {
      totalBobot += item.bobot;
      totalSkorBobot += item.nilaiAkhir * item.bobot;
    }
  }

  const rataRataAkhir = totalSkorBobot > 0 ? Number((totalSkorBobot / 100).toFixed(2)) : 0;

  return (
    <div className="min-h-screen bg-slate-200 p-4 md:p-8">
      <div className="mb-4 text-center">
        <a href="/admin/syahadah" className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] underline text-sm font-semibold">
          &larr; Kembali ke Data Syahadah
        </a>
      </div>
      <TranskripDocument
        santriName={santriName}
        programName={programName}
        isAkbarnas={isAkbarnas}
        items={items}
        rataRataAkhir={rataRataAkhir}
      />
    </div>
  );
}
