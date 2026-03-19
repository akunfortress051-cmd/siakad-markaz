export type MasterSantri = {
  id: string;
  nama: string;
  gender: string;
  sakan: string;
  kamar: string;
  nomorLemari: string;
  dufahNama: string;
  tanggalMulaiDufah: string | null;
  tanggalSampaiDufah: string | null;
  isAktif: boolean;
};

type ApiSantriResponse = {
  id: string;
  nama: string;
  gender: string;
  riwayat?: Array<{
    status?: string;
    dufah?: {
      nama?: string;
      tanggalBuka?: string;
      tanggalTutup?: string;
    } | null;
    lemari?: {
      nomor?: string | null;
      kamar?: {
        nama?: string | null;
        sakan?: {
          nama?: string | null;
        } | null;
      } | null;
    } | null;
  }>;
  isAktif?: boolean;
};

const SANTRI_API_URL = "https://ppdb-markaz.vercel.app/api/santri";

function normalizeSantri(santri: ApiSantriResponse): MasterSantri {
  const assignedRiwayat = santri.riwayat?.find((riwayat) => riwayat.status === "ASSIGNED");

  return {
    id: santri.id,
    nama: santri.nama,
    gender: santri.gender,
    sakan: assignedRiwayat?.lemari?.kamar?.sakan?.nama ?? "-",
    kamar: assignedRiwayat?.lemari?.kamar?.nama ?? "-",
    nomorLemari: assignedRiwayat?.lemari?.nomor ?? "-",
    dufahNama: assignedRiwayat?.dufah?.nama ?? "-",
    tanggalMulaiDufah: assignedRiwayat?.dufah?.tanggalBuka ?? null,
    tanggalSampaiDufah: assignedRiwayat?.dufah?.tanggalTutup ?? null,
    isAktif: santri.isAktif ?? false,
  };
}

export async function getMasterSantriList(): Promise<MasterSantri[]> {
  const response = await fetch(SANTRI_API_URL, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Gagal mengambil master data santri.");
  }

  const santriList = (await response.json()) as ApiSantriResponse[];
  return santriList.map(normalizeSantri);
}

export async function getMasterSantriById(id: string) {
  const santriList = await getMasterSantriList();
  return santriList.find((santri) => santri.id === id) ?? null;
}
