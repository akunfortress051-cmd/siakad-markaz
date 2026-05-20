import { requirePermission } from "@/lib/permission";
import prisma from "@/lib/prisma";
import { getMasterSantriList } from "@/lib/santri-api";
import { redirect } from "next/navigation";
import { CetakUsbuDocument } from "@/components/admin/cetak-usbu-document";

export default async function CetakUsbuPrintPage({ params }: { params: Promise<{ kelasId: string, usbu: string }> }) {
  await requirePermission("syahadah");
  const { kelasId, usbu } = await params;
  const targetUsbu = parseInt(usbu);

  if (targetUsbu < 1 || targetUsbu > 4) redirect("/admin/cetak-usbu");

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

    // We strictly use / 100 for average according to user request (deflasi bobot 100)
    let totalSkorBobot = 0;

    for (const pm of kelas.program.programMapels) {
      const match = riwayat.nilaiList.find((n: any) => n.mapelId === pm.mapelId);

      let score: number | null = null;
      if (match) {
        if (targetUsbu === 1) score = match.nilaiUsbu1;
        if (targetUsbu === 2) score = match.nilaiUsbu2;
        if (targetUsbu === 3) score = match.nilaiNihai;
        if (targetUsbu === 4) score = match.nilaiAkhir;
      }

      if (score !== null && score !== undefined) {
        mapelScores.push(score);
        if (pm.mapel.masuk_akumulasi !== false) {
          const currentWeight = targetUsbu === 4 ? (pm.mapel.bobot ?? 1) : ((pm.mapel as any).bobot_usbu ?? 1);
          totalSkorBobot += score * currentWeight;
        }
      } else {
        mapelScores.push("-");
      }
    }

    const nilaiAkumulatif = Number((totalSkorBobot / 100).toFixed(2));

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
        usbuLabel={targetUsbu === 3 ? "Nihai" : targetUsbu === 4 ? "Akumulatif" : targetUsbu.toString()}
        mapelHeaders={kelas.program.programMapels.map(pm => pm.mapel.nama_indo.toUpperCase() as string)}
        rows={rows}
      />
    </div>
  );
}
