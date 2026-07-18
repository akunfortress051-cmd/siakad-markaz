import { XCircle } from "lucide-react";

export type TasrihDetail = {
  id: string;
  nomorTasrih: string;
  tipeIzin: string;
  alasan: string;
  tanggalMulai: string;
  tanggalSelesai: string | null;
  batasJam?: number;
  batasJamAkhir?: string;
  petugasNama?: string | null;
  sakan?: string | null;
  createdAt: string;
  riwayat: {
    santri: { nama: string };
    kelas: { nama: string } | null;
  };
};

export default function TasrihModal({
  tasrih,
  onClose,
}: {
  tasrih: TasrihDetail;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden relative">
        <div className="p-6 border-b-2 border-dashed border-slate-200 text-center relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
          >
            <XCircle size={24} />
          </button>
          <div className="flex justify-center mb-2">
            <div className="w-16 h-1 bg-[var(--color-primary)] rounded-full"></div>
          </div>
          <h3 className="font-black text-xl tracking-tight text-[var(--color-primary-dark)] uppercase">
            SURAT IZIN SANTRI
          </h3>
          <p className="text-sm font-bold text-[var(--color-primary)] mt-0.5 uppercase tracking-widest">
            (TASRIH {tasrih.tipeIzin.replace("_", " ")})
          </p>
          <p className="text-xs font-bold text-slate-400 font-mono mt-2 border-t border-dashed border-slate-200 pt-2">{tasrih.nomorTasrih}</p>
        </div>

        <div className="p-6 space-y-4 text-sm bg-slate-50">
          <div className="grid grid-cols-[100px_1fr] gap-2">
            <span className="text-slate-500 font-bold">Nama</span>
            <span className="font-bold text-slate-900">{tasrih.riwayat.santri.nama}</span>

            <span className="text-slate-500 font-bold">Kelas</span>
            <span className="font-bold text-slate-900">{tasrih.riwayat.kelas?.nama || "-"}</span>

            <span className="text-slate-500 font-bold">Sakan</span>
            <span className="font-bold text-slate-900">{tasrih.sakan && tasrih.sakan !== "-" ? tasrih.sakan : "-"}</span>

            <span className="text-slate-500 font-bold">Tipe Izin</span>
            <span className="font-bold text-slate-900">{tasrih.tipeIzin.replace("_", " ")}</span>

            <span className="text-slate-500 font-bold">Tanggal</span>
            <span className="font-bold text-slate-900">
              {new Date(tasrih.tanggalMulai).toLocaleDateString("id-ID", { dateStyle: "long" })}
              {tasrih.tanggalSelesai && ` s/d ${new Date(tasrih.tanggalSelesai).toLocaleDateString("id-ID", { dateStyle: "long" })}`}
            </span>

            {tasrih.tipeIzin === "KELUAR_PARE" && tasrih.batasJamAkhir && (
              <>
                <span className="text-slate-500 font-bold">Batas Jam</span>
                <span className="font-bold text-slate-900 bg-yellow-100 px-2 py-0.5 rounded text-yellow-800 w-fit">Maks. 22:00 WIB</span>
              </>
            )}

            <span className="text-slate-500 font-bold">Alasan</span>
            <span className="font-bold text-slate-900 bg-white p-2 border border-slate-200 rounded italic">{tasrih.alasan}</span>
          </div>
        </div>

        <div className="p-4 bg-white border-t border-slate-100 flex justify-between items-center text-xs">
          <div>
            <span className="text-slate-400 block mb-0.5">Dikeluarkan oleh:</span>
            <span className="font-bold text-[var(--color-primary)]">{tasrih.petugasNama || "Sistem Self-Service"}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 block mb-0.5">Waktu Dikeluarkan:</span>
            <span className="font-bold text-slate-700">{new Date(tasrih.createdAt).toLocaleString("id-ID")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
