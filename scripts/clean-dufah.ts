import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const SANTRI_API_URL = "https://ppdb-markaz.vercel.app/api/santri";

async function main() {
  console.log("Memulai proses sinkronisasi dan pembersihan Duf'ah...");
  try {
    // 1. Fetch data dari PPDB
    console.log("Mengambil data master dari PPDB...");
    const response = await fetch(SANTRI_API_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Gagal mengambil data dari PPDB: HTTP ${response.status}`);
    }
    const santriList = await response.json();
    
    // 2. Kumpulkan semua nama dufah yang valid
    const validDufahNames = new Set<string>();
    for (const santri of santriList) {
      if (santri.riwayat && Array.isArray(santri.riwayat)) {
        const assigned = santri.riwayat.find((r: any) => r.status === "ASSIGNED");
        if (assigned && assigned.dufah && assigned.dufah.nama) {
          const dufahName = assigned.dufah.nama.trim();
          if (dufahName && dufahName !== "-") {
            validDufahNames.add(dufahName);
          }
        }
      }
    }
    
    console.log(`Ditemukan ${validDufahNames.size} duf'ah valid dari PPDB:`, Array.from(validDufahNames));

    // 3. Ambil data dufah dari database lokal
    const localDufahs = await prisma.dufah.findMany();
    console.log(`Ditemukan ${localDufahs.length} duf'ah di database lokal.`);

    const invalidDufahs = localDufahs.filter(d => !validDufahNames.has(d.nama));
    
    if (invalidDufahs.length === 0) {
      console.log("Semua duf'ah lokal valid. Tidak ada yang perlu dihapus.");
    } else {
      console.log(`Akan menghapus ${invalidDufahs.length} duf'ah invalid:`, invalidDufahs.map(d => d.nama));
      
      // Karena relasi RiwayatSantri ke Dufah adalah Restrict, 
      // kita harus menghapus RiwayatSantri yang terkait terlebih dahulu.
      const invalidDufahNames = invalidDufahs.map(d => d.nama);
      
      const deletedRiwayat = await prisma.riwayatSantri.deleteMany({
        where: {
          dufahNama: {
            in: invalidDufahNames
          }
        }
      });
      console.log(`Berhasil menghapus ${deletedRiwayat.count} RiwayatSantri yang terkait dengan duf'ah invalid.`);

      const deletedDufah = await prisma.dufah.deleteMany({
        where: {
          nama: {
            in: invalidDufahNames
          }
        }
      });
      console.log(`Berhasil menghapus ${deletedDufah.count} Duf'ah invalid dari database.`);
    }

    // 4. Pastikan dufah yang valid ada di lokal
    const existingDufahNames = new Set(localDufahs.map(d => d.nama));
    const missingDufahs = Array.from(validDufahNames).filter(nama => !existingDufahNames.has(nama));
    
    if (missingDufahs.length > 0) {
      console.log(`Menambahkan ${missingDufahs.length} duf'ah baru dari PPDB:`, missingDufahs);
      await prisma.dufah.createMany({
        data: missingDufahs.map(nama => ({ nama })),
        skipDuplicates: true
      });
    }

    console.log("Proses sinkronisasi dan pembersihan selesai!");
  } catch (error) {
    console.error("Terjadi kesalahan:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
