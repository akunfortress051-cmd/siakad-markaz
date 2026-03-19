import prisma from "@/lib/prisma";
import { calculateStatus } from "@/lib/kelulusan";
import { formatDateIndo, getPredikat, translateDateToArabic } from "@/lib/formatters";
import { getMasterSantriById, getMasterSantriList } from "@/lib/santri-api";

const kelasInclude = {
  kelasMapels: {
    include: {
      mapel: true,
    },
    orderBy: {
      urutan: "asc" as const,
    },
  },
};

function buildDefaultTemplate() {
  const today = new Date();

  return {
    id: 0,
    tgl_cetak_indo: formatDateIndo(today),
    tgl_cetak_arab: translateDateToArabic(today),
    nama_mudir_indo: "Nama Mudir",
    nama_mudir_arab: "اسم المدير",
    jabatan_mudir_indo: "Mudir Markaz Arabiyah",
    jabatan_mudir_arab: "مدير مركز العربية",
  };
}

function serializeKelas(kelas: {
  id: string;
  nama_indo: string;
  nama_arab: string;
  kkm: number;
  kelasMapels: Array<{
    urutan: number;
    mapel: {
      id: string;
      nama_indo: string;
      nama_arab: string;
    };
  }>;
}) {
  return {
    id: kelas.id,
    nama_indo: kelas.nama_indo,
    nama_arab: kelas.nama_arab,
    kkm: kelas.kkm,
    mapelList: kelas.kelasMapels.map((kelasMapel) => ({
      id: kelasMapel.mapel.id,
      nama_indo: kelasMapel.mapel.nama_indo,
      nama_arab: kelasMapel.mapel.nama_arab,
      urutan: kelasMapel.urutan,
    })),
  };
}

export async function getKelasCatalog() {
  const kelasList = await prisma.kelas.findMany({
    include: kelasInclude,
    orderBy: {
      nama_indo: "asc",
    },
  });

  return kelasList.map(serializeKelas);
}

export async function getTemplateData() {
  const template = await prisma.syahadahTemplate.findFirst({
    orderBy: {
      id: "asc",
    },
  });

  return template ?? buildDefaultTemplate();
}

export async function getDashboardSantriRows() {
  const [masterSantriList, internalSantriList] = await Promise.all([
    getMasterSantriList(),
    prisma.santriInternal.findMany({
      include: {
        kelas: {
          include: kelasInclude,
        },
        nilaiList: true,
      },
    }),
  ]);

  const internalMap = new Map(internalSantriList.map((santri) => [santri.id, santri]));

  return masterSantriList
    .map((masterSantri) => {
      const internal = internalMap.get(masterSantri.id);
      const kelas = internal?.kelas ?? null;
      const nilaiList = internal?.nilaiList ?? [];
      const totalMapel = kelas?.kelasMapels.length ?? 0;
      const hasCompleteNilai = totalMapel > 0 && nilaiList.length === totalMapel;
      const status = calculateStatus(
        {
          is_tasmi: internal?.is_tasmi ?? false,
          is_setoran_lulus: internal?.is_setoran_lulus ?? false,
        },
        nilaiList,
        kelas,
      );

      return {
        id: masterSantri.id,
        nama: masterSantri.nama,
        gender: masterSantri.gender,
        lokasi: `${masterSantri.sakan} / ${masterSantri.kamar} / ${masterSantri.nomorLemari}`,
        kelasNama: kelas?.nama_indo ?? "Belum diatur",
        statusKelulusan: kelas && hasCompleteNilai ? status : "TIDAK_LULUS",
        isTasmi: internal?.is_tasmi ?? false,
        isSetoranLulus: internal?.is_setoran_lulus ?? false,
        isAktif: masterSantri.isAktif,
        canPrintSyahadah:
          Boolean(kelas) &&
          hasCompleteNilai &&
          status !== "TIDAK_LULUS",
        canViewIjazah: Boolean(kelas) && hasCompleteNilai,
      };
    })
    .sort((left, right) => left.nama.localeCompare(right.nama, "id"));
}

export async function getSantriFormData(id: string) {
  const [masterSantri, kelasList, internalSantri] = await Promise.all([
    getMasterSantriById(id),
    getKelasCatalog(),
    prisma.santriInternal.findUnique({
      where: { id },
      include: {
        kelas: {
          include: kelasInclude,
        },
        nilaiList: {
          include: {
            mapel: true,
          },
        },
      },
    }),
  ]);

  if (!masterSantri) {
    return null;
  }

  return {
    masterSantri,
    kelasList,
    internalSantri: internalSantri
      ? {
          id: internalSantri.id,
          kelasId: internalSantri.kelasId,
          tempat_lahir: internalSantri.tempat_lahir ?? "",
          tanggal_lahir: internalSantri.tanggal_lahir ?? "",
          alamat: internalSantri.alamat ?? "",
          is_tasmi: internalSantri.is_tasmi,
          is_setoran_lulus: internalSantri.is_setoran_lulus,
          status_kelulusan: internalSantri.status_kelulusan,
          nilaiList: internalSantri.nilaiList.map((nilai) => ({
            id: nilai.id,
            mapelId: nilai.mapelId,
            mapelNama: nilai.mapel.nama_indo,
            skor: nilai.skor,
          })),
        }
      : null,
  };
}

export async function getCertificateData(id: string) {
  const [masterSantri, template, internalSantri] = await Promise.all([
    getMasterSantriById(id),
    getTemplateData(),
    prisma.santriInternal.findUnique({
      where: { id },
      include: {
        kelas: {
          include: kelasInclude,
        },
        nilaiList: {
          include: {
            mapel: true,
          },
        },
      },
    }),
  ]);

  if (!masterSantri || !internalSantri || !internalSantri.kelas) {
    return null;
  }

  const nilaiMap = new Map(internalSantri.nilaiList.map((nilai) => [nilai.mapelId, nilai]));
  const nilaiRows = internalSantri.kelas.kelasMapels.map((kelasMapel) => {
    const nilai = nilaiMap.get(kelasMapel.mapel.id);
    const skor = nilai?.skor ?? null;

    return {
      mapelId: kelasMapel.mapel.id,
      nama_indo: kelasMapel.mapel.nama_indo,
      nama_arab: kelasMapel.mapel.nama_arab,
      skor,
      predikat: skor === null ? null : getPredikat(skor),
    };
  });

  const filledNilaiRows = nilaiRows.filter((nilai) => typeof nilai.skor === "number");
  const average =
    filledNilaiRows.length > 0
      ? filledNilaiRows.reduce((total, nilai) => total + Number(nilai.skor), 0) / filledNilaiRows.length
      : 0;
  const status = calculateStatus(internalSantri, filledNilaiRows.map((nilai) => ({ skor: Number(nilai.skor) })), internalSantri.kelas);

  return {
    masterSantri,
    template,
    santriInternal: internalSantri,
    kelas: serializeKelas(internalSantri.kelas),
    nilaiRows,
    average,
    averagePredikat: getPredikat(average),
    status,
    lokasi: `${masterSantri.sakan} / ${masterSantri.kamar} / ${masterSantri.nomorLemari}`,
  };
}

export async function syncStatusKelulusanByKelasIds(kelasIds: string[]) {
  if (kelasIds.length === 0) {
    return;
  }

  const santriList = await prisma.santriInternal.findMany({
    where: {
      kelasId: {
        in: kelasIds,
      },
    },
    include: {
      kelas: true,
      nilaiList: true,
    },
  });

  if (santriList.length === 0) {
    return;
  }

  await prisma.$transaction(
    santriList.map((santri) =>
      prisma.santriInternal.update({
        where: { id: santri.id },
        data: {
          status_kelulusan: calculateStatus(santri, santri.nilaiList, santri.kelas),
        },
      }),
    ),
  );
}
