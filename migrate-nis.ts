import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("Memulai migrasi ID ke NIS...");
  const res = await fetch("https://ppdb-markaz.vercel.app/api/santri");
  const json = await res.json();
  const dataArray = Array.isArray(json) ? json : json.data;
  
  if (!dataArray) {
    console.log("Gagal fetch data PPDB.");
    return;
  }
  
  // Buat mapping dari ID lama (CUID) ke NIS
  const idToNis = new Map();
  dataArray.forEach((s: any) => {
    if (s.id && s.nis && s.nis.trim() !== "") {
      idToNis.set(s.id, s.nis.trim());
    }
  });
  
  // Ambil semua SantriInternal di Siakad
  const santriLokal = await prisma.santriInternal.findMany();
  let berhasilMigrasi = 0;
  let dilewati = 0;
  let gagal = 0;
  
  console.log(`Ditemukan ${santriLokal.length} santri di database lokal.`);
  
  for (const s of santriLokal) {
    // Jika ID-nya sudah berbentuk NIS (angka), lewati
    if (/^\d+$/.test(s.id)) {
      dilewati++;
      continue;
    }
    
    const nisBaru = idToNis.get(s.id);
    if (nisBaru) {
      try {
        // Karena mengubah Primary Key (id), kita gunakan Raw SQL agar foreign key (RiwayatSantri) ikut ter-update secara CASCADE.
        await prisma.$executeRawUnsafe(`UPDATE "SantriInternal" SET id = $1 WHERE id = $2`, nisBaru, s.id);
        berhasilMigrasi++;
      } catch (err: any) {
        console.error(`Gagal migrasi santri ${s.nama} (${s.id}): ${err.message}`);
        gagal++;
      }
    } else {
      console.log(`Peringatan: Santri ${s.nama} (${s.id}) tidak ditemukan NIS-nya di PPDB.`);
      dilewati++;
    }
  }
  
  console.log("=== HASIL MIGRASI ===");
  console.log(`Berhasil diubah ke NIS : ${berhasilMigrasi}`);
  console.log(`Dilewati/Tidak ada NIS : ${dilewati}`);
  console.log(`Gagal/Error            : ${gagal}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
