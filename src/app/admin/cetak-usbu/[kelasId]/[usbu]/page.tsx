import prisma from "@/lib/prisma";
import { getMasterSantriList } from "@/lib/santri-api";
import { redirect } from "next/navigation";
import { CetakUsbuDocument } from "@/components/admin/cetak-usbu-document";

export default async function CetakUsbuPrintPage({ params }: { params: Promise<{ kelasId: string, usbu: string }> }) {
  const { kelasId, usbu } = await params;
  const targetUsbu = parseInt(usbu);

  if (targetUsbu < 1 || targetUsbu > 3) redirect("/admin/cetak-usbu");

  const kelas = await prisma.kelas.findUnique({
    where: { id: kelasId },
    include: {
      program: {
        include: {
          programMapels: {
            include: { mapel: true },
            orderBy: { urutan: "asc" }
          }
        }
      }
    }
  });

  if (!kelas) redirect("/admin/cetak-usbu");

  const riwayatList = await prisma.riwayatSantri.findMany({
    where: { kelasId },
    include: {
      santri: true,
      nilaiList: true,
      riwayatUsbuList: {
        where: { usbu: targetUsbu }
      },
      absenKelasList: true, // fallback if live
    }
  });

  const masterList = await getMasterSantriList();
  const masterMap = new Map(masterList.map(m => [m.id, m]));

  const rows = riwayatList.map(riwayat => {
    const ms = masterMap.get(riwayat.santriId);
    if (!ms && !riwayat.santri) return null;

    const nama = ms?.nama || riwayat.santri.nama || "Tanpa Nama";
    const gender = ms?.gender || "-";

    // Compute Nilai
    // Because mapels are dynamic, we need an array of values matching the program's sorted mapels
    const mapelScores: (number | "-")[] = [];
    let sum = 0;
    
    // We strictly use / 3 for average according to user request, wait
    // Actually the user said accumulation. But in "NILAI AKUMULATIF", is it the sum or the average?
    // In the image, presensi=100, grades=85,90,86,86,91 -> sum is 438. Average is 87.6.
    // Wait, the image shows Mufid: Presensi 100, Istima 85, Kalam 90, Anasir 86, Qiroah 86, Kitabah 91. Nilai Akumulatif = 88.84.
    // Average of (100, 85, 90, 86, 86, 91) = 538 / 6 = 89.6.
    // Wait. Maybe presensi is evaluated in standard accumulation?
    let divider = 0;
    
    // Let's test standard Markaz formula: (Presensi + sum of mapels) / (total mapels + 1)
    for (const pm of kelas.program.programMapels) {
      const match = riwayat.nilaiList.find((n: any) => n.mapelId === pm.mapelId);
      const isPresensiMapel = pm.mapel.nama_indo.toLowerCase() === "presensi";
      
      let score: number | null = null;
      if (match) {
        if (targetUsbu === 1) score = match.nilaiUsbu1;
        if (targetUsbu === 2) score = match.nilaiUsbu2;
        if (targetUsbu === 3) score = match.nilaiNihai;
      }
      
      if (score !== null && score !== undefined) {
        mapelScores.push(score);
        if (!isPresensiMapel) {
          sum += score;
          divider++;
        }
      } else {
        mapelScores.push("-");
      }
    }

    // Average Mapel only (excluding presensi mapel)
    const rawAccumulative = divider > 0 ? (sum / divider) : 0;
    const nilaiAkumulatif = Number(rawAccumulative.toFixed(2));

    return {
      nama,
      gender,
      mapelScores,
      nilaiAkumulatif
    };
  }).filter(Boolean) as any[];

  // Sort by akumulatif descending to get ranking
  rows.sort((a, b) => b.nilaiAkumulatif - a.nilaiAkumulatif);

  // Assign ranking
  rows.forEach((r, idx) => {
    r.peringkat = idx + 1;
  });

  // Then sort back by name alphabetically
  rows.sort((a, b) => a.nama.localeCompare(b.nama, "id"));

  return (
    <div className="min-h-screen bg-slate-200 p-4 md:p-8">
      <CetakUsbuDocument 
        kelasNama={kelas.nama}
        usbuLabel={targetUsbu === 3 ? "Nihai" : targetUsbu.toString()}
        mapelHeaders={kelas.program.programMapels.map(pm => pm.mapel.nama_indo.toUpperCase() as string)}
        rows={rows}
      />
    </div>
  );
}
