import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Mulai memperbaiki integritas relasi Dufah...");
  
  try {
    // Ambil semua dufahNama unik dari tabel RiwayatSantri menggunakan Raw SQL
    // karena Prisma db push belum selesai sepenuhnya (skema Prisma Client bisa miss-match)
    const result = await prisma.$queryRawUnsafe<any[]>(`SELECT DISTINCT "dufahNama" FROM "RiwayatSantri";`);
    
    console.log(`Ditemukan ${result.length} angkatan (Dufah) yang sedang dipakai di RiwayatSantri.`);

    for (const row of result) {
      const nama = row.dufahNama;
      if (nama) {
        // Coba insert ke tabel Dufah (abaikan jika sudah ada)
        await prisma.$executeRawUnsafe(
          `INSERT INTO "Dufah" ("nama", "currentUsbu") VALUES ($1, 1) ON CONFLICT DO NOTHING;`,
          nama
        );
        console.log(`✅ Berhasil menyisipkan Dufah: ${nama}`);
      }
    }
    
    console.log("Integritas data selesai disinkronkan. Sekarang Anda bisa menjalankan Prisma db push dengan aman!");
  } catch (error) {
    console.error("Terjadi kesalahan:", error);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
