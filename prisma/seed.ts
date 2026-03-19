import { PrismaClient } from "@prisma/client";
import { KELAS_SEED_DATA } from "../src/lib/academic-config";
import { formatDateIndo, translateDateToArabic } from "../src/lib/formatters";

const prisma = new PrismaClient();

async function seedKelasAndMapel() {
  for (const kelasData of KELAS_SEED_DATA) {
    const kelas = await prisma.kelas.upsert({
      where: { nama_indo: kelasData.nama_indo },
      update: {
        nama_arab: kelasData.nama_arab,
        kkm: kelasData.kkm,
      },
      create: {
        nama_indo: kelasData.nama_indo,
        nama_arab: kelasData.nama_arab,
        kkm: kelasData.kkm,
      },
    });

    for (const [index, mapelData] of kelasData.mapel.entries()) {
      const mapel = await prisma.mapel.upsert({
        where: { nama_indo: mapelData.nama_indo },
        update: {
          nama_arab: mapelData.nama_arab,
        },
        create: {
          nama_indo: mapelData.nama_indo,
          nama_arab: mapelData.nama_arab,
        },
      });

      await prisma.kelasMapel.upsert({
        where: {
          kelasId_mapelId: {
            kelasId: kelas.id,
            mapelId: mapel.id,
          },
        },
        update: {
          urutan: index + 1,
        },
        create: {
          kelasId: kelas.id,
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
  await seedKelasAndMapel();
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
