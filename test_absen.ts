import { getActiveRiwayatListForAbsen } from './src/lib/absensi';
import prisma from './src/lib/prisma';

async function main() {
  const kelasId = "cmp2zypjc006qc3rz01dlm38v";
  console.log("Testing kelasId:", kelasId);

  const rawRiwayat = await prisma.riwayatSantri.findMany({
    where: { kelasId }
  });
  console.log("Raw riwayat di DB untuk kelas ini:", rawRiwayat.length);
  if (rawRiwayat.length > 0) {
      console.log("Contoh santriId:", rawRiwayat[0].santriId, "Dufah:", rawRiwayat[0].dufahNama);
  }

  const list = await getActiveRiwayatListForAbsen(kelasId);
  console.log("List length setelah difilter getActiveRiwayatListForAbsen:", list.length);
}

main().catch(console.error);
