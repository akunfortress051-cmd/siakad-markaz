// Layout system for online syahadah — standalone from offline layout

// F4 (Folio) landscape: 330mm × 215mm
export const ONLINE_PAPER_WIDTH_MM = 330;
export const ONLINE_PAPER_HEIGHT_MM = 215;

export const ONLINE_LAYOUT_ELEMENT_KEYS = [
  "paragrafPembuka",
  "namaSantri",
  "pengantarProgram",
  "teksProgram",
  "teksPeriode",
  "rataRata",
  "doaPenutup",
  // Left signature block (Mudir)
  "jabatanKiri",
  "stempelKiri",
  "ttdKiri",
  "namaKiri",
  // Right signature block (Aminah)
  "jabatanKanan",
  "stempelKanan",
  "ttdKanan",
  "namaKanan",
  // Other
  "tanggalCetak",
  "qrCode",
] as const;

export type OnlineLayoutElementKey = (typeof ONLINE_LAYOUT_ELEMENT_KEYS)[number];

export type OnlineElementOffset = {
  offsetX: number;
  offsetY: number;
  fontSize?: number;
};

export type OnlineLayoutData = Record<OnlineLayoutElementKey, OnlineElementOffset>;

export const ONLINE_ELEMENT_LABELS: Record<OnlineLayoutElementKey, string> = {
  paragrafPembuka: "Paragraf Pembuka",
  namaSantri: "Nama Peserta",
  pengantarProgram: "Pengantar Program",
  teksProgram: "Nama Program",
  teksPeriode: "Teks Periode",
  rataRata: "Rata-rata",
  doaPenutup: "Doa Penutup",
  jabatanKiri: "Jabatan Kiri",
  stempelKiri: "Cap Kiri",
  ttdKiri: "TTD Kiri",
  namaKiri: "Nama Kiri",
  jabatanKanan: "Jabatan Kanan",
  stempelKanan: "Cap Kanan",
  ttdKanan: "TTD Kanan",
  namaKanan: "Nama Kanan",
  tanggalCetak: "Tanggal Cetak",
  qrCode: "QR Code",
};

export function getDefaultOnlineLayout(): OnlineLayoutData {
  const layout: Partial<OnlineLayoutData> = {};
  for (const key of ONLINE_LAYOUT_ELEMENT_KEYS) {
    layout[key] = { offsetX: 0, offsetY: 0 };
  }
  layout.namaSantri = { offsetX: 0, offsetY: 0, fontSize: 32 };
  return layout as OnlineLayoutData;
}

export function mergeOnlineLayout(saved: Partial<OnlineLayoutData> | null): OnlineLayoutData {
  const base = getDefaultOnlineLayout();
  if (!saved) return base;
  for (const key of ONLINE_LAYOUT_ELEMENT_KEYS) {
    if (saved[key]) {
      base[key] = { ...base[key], ...saved[key] };
    }
  }
  return base;
}
