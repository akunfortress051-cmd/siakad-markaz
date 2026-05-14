import prisma from "@/lib/prisma";
import { calculateStatus } from "@/lib/kelulusan";
import { formatDateIndo, getPredikat, translateDateToArabic } from "@/lib/formatters";
import { getMasterSantriById, getMasterSantriList } from "@/lib/santri-api";

const programInclude = {
  programMapels: {
    include: {
      mapel: true,
    },
    orderBy: {
      urutan: "asc" as const,
    },
  },
  kelasList: {
    orderBy: {
      nama: "asc" as const,
    },
  },
};

function buildDefaultTemplate() {
  const today = new Date();

  return {
    id: 0,
    tgl_cetak_indo: formatDateIndo(today),
    tgl_cetak_arab: translateDateToArabic(today),
    tgl_mulai_indo: null,
    tgl_mulai_arab: null,
    tgl_selesai_indo: null,
    tgl_selesai_arab: null,
    nama_mudir_indo: "Nama Mudir",
    nama_mudir_arab: "اسم المدير",
    jabatan_mudir_indo: "Mudir Markaz Arabiyah",
    jabatan_mudir_arab: "مدير مركز العربية",
  };
}

function serializeProgram(program: {
  id: string;
  nama_indo: string;
  nama_arab: string;
  kkm: number;
  programMapels: Array<{
    urutan: number;
    mapel: {
      id: string;
      nama_indo: string;
      nama_arab: string;
      jumlah_tes: number;
      tampil_di_syahadah: boolean;
      masuk_akumulasi: boolean;
      bobot: number;
    };
  }>;
  kelasList?: Array<{
    id: string;
    nama: string;
  }>;
}) {
  return {
    id: program.id,
    nama_indo: program.nama_indo,
    nama_arab: program.nama_arab,
    kkm: program.kkm,
    mapelList: program.programMapels.map((programMapel) => ({
      id: programMapel.mapel.id,
      nama_indo: programMapel.mapel.nama_indo,
      nama_arab: programMapel.mapel.nama_arab,
      urutan: programMapel.urutan,
      jumlah_tes: programMapel.mapel.jumlah_tes,
      tampil_di_syahadah: programMapel.mapel.tampil_di_syahadah,
      masuk_akumulasi: programMapel.mapel.masuk_akumulasi,
      bobot: programMapel.mapel.bobot,
    })),
    kelasList: program.kelasList ?? [],
  };
}

export async function getProgramCatalog() {
  const programList = await prisma.program.findMany({
    include: programInclude,
    orderBy: {
      nama_indo: "asc",
    },
  });

  return programList.map(serializeProgram);
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
  const [masterSantriList, riwayatList] = await Promise.all([
    getMasterSantriList(),
    prisma.riwayatSantri.findMany({
      include: {
        program: {
          include: programInclude,
        },
        kelas: true,
        nilaiList: true,
      },
    }),
  ]);

  // Map riwayat by santriId + dufahNama
  const riwayatMap = new Map<string, typeof riwayatList[0]>();
  for (const riwayat of riwayatList) {
    riwayatMap.set(`${riwayat.santriId}_${riwayat.dufahNama}`, riwayat);
  }

  return masterSantriList
    .map((masterSantri) => {
      // Find riwayat for the current active Dufah from API
      const riwayat = riwayatMap.get(`${masterSantri.id}_${masterSantri.dufahNama}`);
      const program = riwayat?.program ?? null;
      const kelas = riwayat?.kelas ?? null;
      const nilaiList = riwayat?.nilaiList ?? [];
      const totalMapel = program?.programMapels.length ?? 0;
      const hasCompleteNilai = totalMapel > 0 && nilaiList.length === totalMapel && 
        nilaiList.every((n: any) => {
          const m = program?.programMapels.find((pm: any) => pm.mapelId === n.mapelId)?.mapel;
          if (m?.jumlah_tes === 1) return n.nilaiAkhir !== null;
          return n.nilaiUsbu1 !== null && n.nilaiUsbu2 !== null && n.nilaiNihai !== null;
        });
      const accumulativeNilai = nilaiList.filter((n: any) => {
        const m = program?.programMapels.find((pm: any) => pm.mapelId === n.mapelId)?.mapel;
        return m?.masuk_akumulasi !== false;
      });
      const status = calculateStatus(
        {
          is_tasmi: riwayat?.is_tasmi ?? false,
        },
        accumulativeNilai.map((n: any) => ({ skor: n.nilaiAkhir || 0 })),
        program,
      );

      return {
        id: masterSantri.id,
        nama: masterSantri.nama,
        gender: masterSantri.gender,
        lokasi: `${masterSantri.sakan} / ${masterSantri.kamar} / ${masterSantri.nomorLemari}`,
        programNama: program?.nama_indo ?? "Belum diatur",
        programId: program?.id ?? null,
        kelasNama: kelas?.nama ?? "-",
        kelasId: kelas?.id ?? null,
        statusKelulusan: program && hasCompleteNilai ? status : "TIDAK_LULUS",
        isTasmi: riwayat?.is_tasmi ?? false,
        isAktif: masterSantri.isAktif,
        canPrintSyahadah:
          Boolean(program) &&
          hasCompleteNilai &&
          status !== "TIDAK_LULUS",
        canViewIjazah: Boolean(program) && hasCompleteNilai,
        dufahNama: masterSantri.dufahNama,
        riwayatId: riwayat?.id ?? null,
      };
    })
    .sort((left: any, right: any) => left.nama.localeCompare(right.nama, "id"));
}

export async function getSantriFormData(id: string) {
  let riwayatMatch = await prisma.riwayatSantri.findUnique({
    where: { id },
  });

  const santriId = riwayatMatch ? riwayatMatch.santriId : id;

  const [masterSantriRes, programList, santriInternal] = await Promise.all([
    getMasterSantriById(santriId),
    getProgramCatalog(),
    prisma.santriInternal.findUnique({
      where: { id: santriId },
      include: {
        riwayatRecords: {
          include: {
            program: {
              include: programInclude,
            },
            nilaiList: {
              include: {
                mapel: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const masterSantri = masterSantriRes ?? (santriInternal ? {
    id: santriInternal.id,
    nama: santriInternal.nama ?? "Tanpa Nama",
    gender: "-",
    sakan: "-",
    kamar: "-",
    nomorLemari: "-",
    dufahNama: riwayatMatch?.dufahNama ?? "-",
    tanggalMulaiDufah: null,
    tanggalSampaiDufah: null,
    isAktif: false,
  } : null);

  if (!masterSantri) {
    return null;
  }

  // Cari riwayat aktif: jika id adalah riwayatId, gunakan riwayat tersebut.
  // Jika tidak, gunakan dufah masterSantri.
  const activeRiwayat = santriInternal?.riwayatRecords.find(
    (r: any) => riwayatMatch ? r.id === riwayatMatch.id : r.dufahNama === masterSantri.dufahNama
  ) ?? null;

  let activeFlags = { u1: false, u2: false, u3: false };
  const dufah = await prisma.dufah.findUnique({
    where: { nama: masterSantri.dufahNama }
  });
  if (dufah) {
    activeFlags = { u1: dufah.usbu1Active, u2: dufah.usbu2Active, u3: dufah.usbu3Active };
  }

  return {
    masterSantri,
    activeFlags,
    programList,
    internalSantri: santriInternal
      ? {
        id: santriInternal.id,
        tempat_lahir: santriInternal.tempat_lahir ?? "",
        tanggal_lahir: santriInternal.tanggal_lahir ?? "",
        alamat: santriInternal.alamat ?? "",
      }
      : null,
    activeRiwayat: activeRiwayat
      ? {
        id: activeRiwayat.id,
        dufahNama: activeRiwayat.dufahNama,
        programId: activeRiwayat.programId,
        kelasId: activeRiwayat.kelasId,
        is_tasmi: activeRiwayat.is_tasmi,
        status_kelulusan: activeRiwayat.status_kelulusan,
        nilaiList: activeRiwayat.nilaiList.map((nilai: any) => ({
          id: nilai.id,
          mapelId: nilai.mapelId,
          mapelNama: nilai.mapel.nama_indo,
          nilaiUsbu1: nilai.nilaiUsbu1,
          nilaiUsbu2: nilai.nilaiUsbu2,
          nilaiNihai: nilai.nilaiNihai,
          nilaiAkhir: nilai.nilaiAkhir,
          skor: nilai.nilaiAkhir ?? 0,
        })),
      } : null,
    allRiwayat: santriInternal?.riwayatRecords ?? [],
  };
}

// Note: id here can be interpreted as santriId. To print older dufah, it needs riwayatId.
// For now, we support the current route which passes santriId to get their current Active certificate,
// or we rewrite it to accept RiwayatId. Let's adjust to find default active riwayat if Santri ID matches,
// otherwise find by RiwayatId directly (to allow printing historical ones).
export async function getCertificateData(id: string) {
  // Check if id is actually a riwayatId
  let riwayat = await prisma.riwayatSantri.findUnique({
    where: { id },
    include: {
      santri: true,
      program: {
        include: programInclude,
      },
      nilaiList: {
        include: {
          mapel: true,
        },
      },
    },
  });

  let santriIdToFetch = id;
  
  // If not found by riwayatId, it must be santriId. Get active riwayat by matching Dufah.
  if (!riwayat) {
    const masterSantriFallback = await getMasterSantriById(id);
    if (!masterSantriFallback) return null;
    
    riwayat = await prisma.riwayatSantri.findUnique({
      where: { santriId_dufahNama: { santriId: id, dufahNama: masterSantriFallback.dufahNama } },
      include: {
        santri: true,
        program: {
          include: programInclude,
        },
        nilaiList: {
          include: {
            mapel: true,
          },
        },
      },
    });
    // No riwayat found for active dufah either
    if (!riwayat) return null;
  } else {
    santriIdToFetch = riwayat.santriId;
  }

  const [masterSantriRes, template] = await Promise.all([
    getMasterSantriById(santriIdToFetch),
    getTemplateData(),
  ]);

  const masterSantri = masterSantriRes ?? {
    id: riwayat.santri.id,
    nama: riwayat.santri.nama ?? "Tanpa Nama",
    gender: "-",
    sakan: "-",
    kamar: "-",
    nomorLemari: "-",
    dufahNama: riwayat.dufahNama,
    tanggalMulaiDufah: null,
    tanggalSampaiDufah: null,
    isAktif: false,
  };

  if (!masterSantri || !riwayat.program) {
    return null;
  }

  let allNilaiList = [...riwayat.nilaiList];
  let allProgramMapels = [...riwayat.program.programMapels];

  if (riwayat.program.nama_indo.toLowerCase().includes("akbarnas")) {
    const historicalRiwayat = await prisma.riwayatSantri.findMany({
      where: {
        santriId: santriIdToFetch,
        program: {
          nama_indo: { contains: "akbarnas", mode: "insensitive" }
        },
        id: { not: riwayat.id }
      },
      include: {
        nilaiList: { include: { mapel: true } }
      },
      orderBy: { dufahNama: 'asc' }
    });

    for (const hist of historicalRiwayat) {
      allNilaiList = [...allNilaiList, ...hist.nilaiList];
    }
  }

  // Filter tampil_di_syahadah
  allProgramMapels = allProgramMapels.filter((pm: any) => pm.mapel.tampil_di_syahadah !== false);

  const nilaiMap = new Map();
  for (const nilai of allNilaiList) {
    // Keep the one that has actual score if multiple exist
    if (nilai.nilaiAkhir !== null || !nilaiMap.has(nilai.mapelId)) {
      nilaiMap.set(nilai.mapelId, nilai);
    }
  }

  const nilaiRows = allProgramMapels.map((programMapel: any) => {
    const nilai = nilaiMap.get(programMapel.mapel.id);
    const skor = nilai?.nilaiAkhir ?? null;

    return {
      mapelId: programMapel.mapel.id,
      nama_indo: programMapel.mapel.nama_indo,
      nama_arab: programMapel.mapel.nama_arab,
      nilaiUsbu1: nilai?.nilaiUsbu1 ?? null,
      nilaiUsbu2: nilai?.nilaiUsbu2 ?? null,
      nilaiNihai: nilai?.nilaiNihai ?? null,
      nilaiAkhir: nilai?.nilaiAkhir ?? null,
      skor,
      predikat: skor === null ? null : getPredikat(skor),
      masuk_akumulasi: programMapel.mapel.masuk_akumulasi ?? true,
      bobot: programMapel.mapel.bobot ?? 1,
    };
  });

  const accumulativeRows = nilaiRows.filter((nilai: any) => typeof nilai.skor === "number" && nilai.masuk_akumulasi);
  const totalSkorBobot = accumulativeRows.reduce((total: any, nilai: any) => total + (Number(nilai.skor) * nilai.bobot), 0);
  const average = accumulativeRows.length > 0 ? totalSkorBobot / 100 : 0;
  const status = calculateStatus(riwayat, accumulativeRows.map((nilai: any) => ({ skor: Number(nilai.skor) })), riwayat.program);

  return {
    masterSantri,
    template,
    riwayatSantri: riwayat,
    santriInternal: riwayat.santri,
    program: serializeProgram(riwayat.program),
    nilaiRows,
    average,
    averagePredikat: getPredikat(average),
    status,
    lokasi: `${masterSantri.sakan} / ${masterSantri.kamar} / ${masterSantri.nomorLemari}`,
  };
}

export async function syncStatusKelulusanByProgramIds(programIds: string[]) {
  if (programIds.length === 0) {
    return;
  }

  const riwayatList = await prisma.riwayatSantri.findMany({
    where: {
      programId: {
        in: programIds,
      },
    },
    include: {
      program: true,
      nilaiList: true,
    },
  });

  if (riwayatList.length === 0) {
    return;
  }

  await prisma.$transaction(
    riwayatList.map((riwayat: any) =>
      prisma.riwayatSantri.update({
        where: { id: riwayat.id },
        data: {
          status_kelulusan: calculateStatus(riwayat, riwayat.nilaiList, riwayat.program),
        },
      }),
    ),
  );
}

export async function getRiwayatSantriRows() {
  const [masterSantriList, riwayatList] = await Promise.all([
    getMasterSantriList(),
    prisma.riwayatSantri.findMany({
      include: {
        santri: true,
        program: {
          include: programInclude,
        },
        kelas: true,
        nilaiList: {
          include: {
            mapel: true,
          },
        },
        absenSakanList: true,
        absenKelasList: true,
        absenKegiatanList: {
          include: {
            kategori: true,
          },
        },
      },
      orderBy: {
        dufahNama: "desc",
      },
    }),
  ]);

  const masterMap = new Map<string, typeof masterSantriList[0]>();
  for (const ms of masterSantriList) {
    masterMap.set(ms.id, ms);
  }

  const groupsMap = new Map<string, any>();

  for (const riwayat of riwayatList) {
    const ms = masterMap.get(riwayat.santriId);
    const isHistorical = !ms || !ms.isAktif || riwayat.dufahNama !== ms.dufahNama;
    
    if (!isHistorical) {
      continue;
    }

    if (!groupsMap.has(riwayat.santriId)) {
      groupsMap.set(riwayat.santriId, {
        santriId: riwayat.santriId,
        nama: ms ? ms.nama : (riwayat.santri?.nama ?? "Tanpa Nama"),
        gender: ms?.gender ?? "-",
        lokasi: ms ? `${ms.sakan} / ${ms.kamar} / ${ms.nomorLemari}` : "-",
        records: [],
      });
    }

    const group = groupsMap.get(riwayat.santriId);
    const program = riwayat.program;
    const kelas = riwayat.kelas;
    const nilaiList = riwayat.nilaiList ?? [];
    const totalMapel = program?.programMapels.length ?? 0;
    const hasCompleteNilai = totalMapel > 0 && nilaiList.length === totalMapel &&
      nilaiList.every((n: any) => {
        const m = program?.programMapels.find((pm: any) => pm.mapelId === n.mapelId)?.mapel;
        if (m?.jumlah_tes === 1) return n.nilaiAkhir !== null;
        return n.nilaiUsbu1 !== null && n.nilaiUsbu2 !== null && n.nilaiNihai !== null;
      });
    const accumulativeNilai = nilaiList.filter((n: any) => {
      const m = program?.programMapels.find((pm: any) => pm.mapelId === n.mapelId)?.mapel;
      return m?.masuk_akumulasi !== false;
    });
    const status = calculateStatus(
      { is_tasmi: riwayat.is_tasmi },
      accumulativeNilai.map((n: any) => ({ skor: n.nilaiAkhir || 0 })),
      program,
    );

    const absenSakanSummary = {
      hadir: riwayat.absenSakanList.filter((a: any) => a.status === "HADIR").length,
      izin: riwayat.absenSakanList.filter((a: any) => a.status === "IZIN").length,
      sakit: riwayat.absenSakanList.filter((a: any) => a.status === "SAKIT").length,
      alpha: riwayat.absenSakanList.filter((a: any) => a.status === "ALPHA").length,
      total: riwayat.absenSakanList.length,
    };

    // Group kelas absen by hissoh
    const hissohList = ["ULA", "TSANI", "TSALIS", "RABI", "KHAMIS"];
    const absenKelasByHissoh = hissohList.map((h) => {
      const list = riwayat.absenKelasList.filter((a: any) => a.hissoh === h);
      return {
        hissoh: h,
        hadir: list.filter((a: any) => a.status === "HADIR").length,
        alpha: list.filter((a: any) => a.status === "ALPHA").length,
        total: list.length,
      };
    }).filter((h) => h.total > 0);

    // Group kegiatan absen by kategori
    const kegiatanMap = new Map<string, { nama: string; hadir: number; alpha: number; total: number }>();
    for (const a of riwayat.absenKegiatanList) {
      const key = a.kategoriId;
      const kategoriNama = a.kategori?.nama ?? "Kegiatan";
      if (!kegiatanMap.has(key)) {
        kegiatanMap.set(key, { nama: kategoriNama, hadir: 0, alpha: 0, total: 0 });
      }
      const entry = kegiatanMap.get(key)!;
      entry.total += 1;
      if (a.status === "HADIR") entry.hadir += 1;
      else if (a.status === "ALPHA") entry.alpha += 1;
    }

    group.records.push({
      riwayatId: riwayat.id,
      dufahNama: riwayat.dufahNama,
      programNama: program?.nama_indo ?? "Belum diatur",
      programId: program?.id ?? null,
      kelasNama: kelas?.nama ?? "-",
      kelasId: kelas?.id ?? null,
      statusKelulusan: program && hasCompleteNilai ? status : "TIDAK_LULUS",
      isTasmi: riwayat.is_tasmi ?? false,
      canPrintSyahadah: Boolean(program) && hasCompleteNilai && status !== "TIDAK_LULUS",
      canViewIjazah: Boolean(program) && hasCompleteNilai,
      nilaiList: nilaiList.map((n: any) => ({
        mapelNama: n.mapel.nama_indo,
        skor: n.nilaiAkhir ?? 0,
      })),
      rataRata: nilaiList.length > 0 ? (nilaiList.reduce((acc: number, n: any) => acc + (n.nilaiAkhir ?? 0), 0) / nilaiList.length).toFixed(2) : null,
      absenSakan: absenSakanSummary,
      absenKelasByHissoh,
      absenKegiatan: Array.from(kegiatanMap.values()),
    });
  }

  return Array.from(groupsMap.values()).sort((a, b) => a.nama.localeCompare(b.nama, "id"));
}

