type StatusSource = {
  is_tasmi: boolean;
  is_setoran_lulus: boolean;
};

type NilaiSource = {
  skor: number;
};

type KelasSource = {
  kkm: number;
};

export type StatusKelulusan = "LULUS" | "MUSYAROKAH" | "TIDAK_LULUS";

export function calculateStatus(
  santri: StatusSource,
  nilaiList: NilaiSource[],
  kelas: KelasSource | null,
): StatusKelulusan {
  if (!santri.is_tasmi || !santri.is_setoran_lulus || !kelas) {
    return "TIDAK_LULUS";
  }

  const hasNilaiDiBawahKkm = nilaiList.some((nilai) => nilai.skor < kelas.kkm);

  if (hasNilaiDiBawahKkm) {
    return "MUSYAROKAH";
  }

  return "LULUS";
}
