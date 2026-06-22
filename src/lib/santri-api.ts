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
  kategori: string;
  tempatLahir?: string | null;
  tanggalLahir?: string | null;
  alamat?: string | null;
  noWaSantri: string;
  kabupaten: string;
  bulanKe: number;
};

type ApiSantriResponse = {
  id: string;
  nis?: string;
  nama: string;
  gender: string;
  tempatLahir?: string | null;
  tanggalLahir?: string | null;
  detailAlamat?: string | null;
  noWaSantri?: string | null;
  kabupaten?: string | null;
  riwayat?: Array<{
    status?: string;
    bulanKe?: number;
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
  kategori?: string;
};

const PPDB_URL = process.env.NEXT_PUBLIC_PPDB_URL || "https://ppdb.markazarabiyah.site";

function normalizeSantri(santri: ApiSantriResponse): MasterSantri {
  const assignedRiwayat = santri.riwayat?.find((riwayat) => riwayat.status === "ASSIGNED");

  return {
    id: santri.nis as string,
    nama: santri.nama,
    gender: santri.gender,
    sakan: assignedRiwayat?.lemari?.kamar?.sakan?.nama ?? "-",
    kamar: assignedRiwayat?.lemari?.kamar?.nama ?? "-",
    nomorLemari: assignedRiwayat?.lemari?.nomor ?? "-",
    dufahNama: assignedRiwayat?.dufah?.nama ?? "-",
    tanggalMulaiDufah: assignedRiwayat?.dufah?.tanggalBuka ?? null,
    tanggalSampaiDufah: assignedRiwayat?.dufah?.tanggalTutup ?? null,
    isAktif: santri.isAktif ?? false,
    kategori: santri.kategori ?? "-",
    tempatLahir: santri.tempatLahir ?? "",
    tanggalLahir: santri.tanggalLahir ?? null,
    alamat: santri.detailAlamat ?? "",
    noWaSantri: santri.noWaSantri ?? "-",
    kabupaten: santri.kabupaten ?? "-",
    bulanKe: assignedRiwayat?.bulanKe ?? 0,
  };
}

export async function getMasterSantriList(): Promise<MasterSantri[]> {
  try {
    const apiKey = process.env.PPDB_API_KEY || "markaz-siakad-api-2026";
    const response = await fetch(`${PPDB_URL}/api/santri/siakad?key=${apiKey}&filter=AKTIF`, {
      next: { revalidate: 0, tags: ["santri-data"] },
    });

    if (!response.ok) {
      console.error(`Gagal mengambil master data santri: HTTP ${response.status}`);
      return [];
    }

    const json = await response.json();
    const dataArray = Array.isArray(json) ? json : json.data;
    if (!Array.isArray(dataArray)) {
      console.error("Unexpected santri API response format:", json);
      return [];
    }

    const validSantri = dataArray.filter((s: ApiSantriResponse) => s.nis && s.nis.trim() !== "");

    const normalizedSantri = validSantri.map(normalizeSantri);

    // Filter: Hanya masukkan santri yang sudah punya sakan (aktif bulan ini)
    return normalizedSantri.filter((s) => s.sakan && s.sakan !== "-");
  } catch (error) {
    console.error("Fetch failed for master data santri:", error);
    return [];
  }
}

export async function getMasterSantriById(id: string) {
  const santriList = await getMasterSantriList();
  return santriList.find((santri) => santri.id === id) ?? null;
}
