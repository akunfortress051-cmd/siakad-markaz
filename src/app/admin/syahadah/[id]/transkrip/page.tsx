import { requirePermission } from "@/lib/permission";
import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { TranskripDocument } from "@/components/admin/transkrip-document";
import { getMasterSantriById } from "@/lib/santri-api";
import { calcAkumulatif, calcAkbarnasMapelAverage, calcMapelNilaiAkhir, applyNilaiTambahan } from "@/lib/grade-calculator";

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

    const b1Avg = calcMapelNilaiAkhir({ u1: b1.u1, u2: b1.u2, n: b1.n }, isAkbarnas);
    const b2Avg = calcMapelNilaiAkhir({ u1: b2.u1, u2: b2.u2, n: b2.n }, isAkbarnas);

    // Calculate Nilai Akhir Mapel using Centralized Source of Truth
    let nilaiAkhir: number | null = null;
    const records = [n1, n2].filter(Boolean) as any[];

    if (isAkbarnas) {
      nilaiAkhir = calcAkbarnasMapelAverage(records);
    } else {
      if (n1) {
        if (n1.nilaiAkhir !== null && n1.nilaiAkhir !== undefined) {
          nilaiAkhir = n1.nilaiAkhir;
        } else {
          nilaiAkhir = calcMapelNilaiAkhir({ u1: b1.u1, u2: b1.u2, n: b1.n }, false);
        }
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
      nilaiAkhir = applyNilaiTambahan(nilaiAkhir, tambahan);
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
  const rataRataAkhir = calcAkumulatif(
    items.filter(item => item.masukAkumulasi && item.nilaiAkhir !== null)
      .map(item => ({ score: item.nilaiAkhir!, bobot: item.bobot }))
  );

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
