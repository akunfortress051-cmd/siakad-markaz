import { PrismaClient } from "@prisma/client";
import { PROGRAM_SEED_DATA } from "../src/lib/academic-config";
import { formatDateIndo, translateDateToArabic } from "../src/lib/formatters";

const prisma = new PrismaClient();

async function seedProgramAndMapel() {
  for (const programData of PROGRAM_SEED_DATA) {
    const program = await prisma.program.upsert({
      where: { nama_indo: programData.nama_indo },
      update: {
        nama_arab: programData.nama_arab,
        kkm: programData.kkm,
      },
      create: {
        nama_indo: programData.nama_indo,
        nama_arab: programData.nama_arab,
        kkm: programData.kkm,
      },
    });

    // Ambil daftar relasi lama untuk program ini agar kita tahu mapel mana saja milik program ini
    const oldRels = await prisma.programMapel.findMany({
      where: { programId: program.id },
      include: { mapel: true },
    });
    const oldMapelMap = new Map(oldRels.map(r => [r.mapel.nama_indo, r.mapel]));

    // Hapus relasi lama agar urutan bisa di-rebuild tanpa konflik unique constraint
    await prisma.programMapel.deleteMany({ where: { programId: program.id } });

    // Ambil daftar riwayatId untuk program ini agar siap melakukan migrasi Nilai jika diperlukan
    const riwayatList = await prisma.riwayatSantri.findMany({
      where: { programId: program.id },
      select: { id: true }
    });
    const riwayatIds = riwayatList.map(r => r.id);

    for (const [index, mapelData] of programData.mapel.entries()) {
      let mapel = oldMapelMap.get(mapelData.nama_indo);
      let needsMigrationFromOldId: string | null = null;

      if (mapel) {
        // Cek apakah mapel ini MASIH dipakai/di-share oleh program lain
        const otherProgramCount = await prisma.programMapel.count({
          where: { mapelId: mapel.id, programId: { not: program.id } }
        });

        // Jika dipakai program lain, kita pisahkan agar setiap program memiliki entitas Mapel mandiri
        // dan migrasikan data Nilai lama santri ke entitas Mapel yang baru ini.
        if (otherProgramCount > 0) {
          needsMigrationFromOldId = mapel.id;
          mapel = undefined; // Force create new independent mapel
        }
      }

      if (!mapel) {
        // Cari mapel dengan nama tersebut yang belum dipakai program manapun
        mapel = await prisma.mapel.findFirst({
          where: {
            nama_indo: mapelData.nama_indo,
            programMapels: { none: {} },
          },
        }) ?? undefined;
      }

      if (mapel) {
        await prisma.mapel.update({
          where: { id: mapel.id },
          data: {
            nama_arab: mapelData.nama_arab,
            bobot: mapelData.bobot ?? 1,
            bobot_usbu: mapelData.bobot_usbu ?? 1,
            masuk_akumulasi: mapelData.masuk_akumulasi ?? true,
            tampil_di_syahadah: mapelData.tampil_di_syahadah ?? true,
            jumlah_tes: mapelData.jumlah_tes ?? 3,
          },
        });
      } else {
        mapel = await prisma.mapel.create({
          data: {
            nama_indo: mapelData.nama_indo,
            nama_arab: mapelData.nama_arab,
            bobot: mapelData.bobot ?? 1,
            bobot_usbu: mapelData.bobot_usbu ?? 1,
            masuk_akumulasi: mapelData.masuk_akumulasi ?? true,
            tampil_di_syahadah: mapelData.tampil_di_syahadah ?? true,
            jumlah_tes: mapelData.jumlah_tes ?? 3,
          },
        });

        if (needsMigrationFromOldId && riwayatIds.length > 0) {
          await prisma.nilai.updateMany({
            where: {
              mapelId: needsMigrationFromOldId,
              riwayatId: { in: riwayatIds }
            },
            data: { mapelId: mapel.id }
          });
        }
      }

      await prisma.programMapel.create({
        data: {
          programId: program.id,
          mapelId: mapel.id,
          urutan: index + 1,
        },
      });
    }
  }
}

async function seedTemplate() {
  const existingTemplate = await prisma.syahadahTemplate.findFirst();
  const today = new Date();

  if (!existingTemplate) {
    await prisma.syahadahTemplate.create({
      data: {
        tgl_cetak_indo: formatDateIndo(today),
        tgl_cetak_arab: translateDateToArabic(today),
        nama_mudir_indo: "Nama Mudir",
        nama_mudir_arab: "اسم المدير",
        jabatan_mudir_indo: "Mudir Markaz Arabiyah",
        jabatan_mudir_arab: "مدير مركز العربية",
      },
    });
  }
}

async function main() {
  await seedProgramAndMapel();
  await seedTemplate();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
