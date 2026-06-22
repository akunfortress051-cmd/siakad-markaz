"use client";

import { XCircle } from "lucide-react";

export default function TataTertibModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden relative max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-slate-200 text-center relative shrink-0">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
          >
            <XCircle size={24} />
          </button>
          <h3 className="font-black text-xl tracking-tight text-[var(--color-primary-dark)]">
            TATA TERTIB PERIZINAN SANTRI
          </h3>
          <p className="text-sm font-bold text-slate-500 mt-1">Markaz Arabiyah dan Markaz Turats</p>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 text-sm leading-relaxed text-slate-700">
          <section>
            <h4 className="font-bold text-slate-900 mb-2">1. Jenis Perizinan</h4>
            <p>Perizinan dalam ketentuan ini mencakup lima jenis, yaitu:</p>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>Perizinan keluar wilayah Pare</li>
              <li>Perizinan dalam wilayah Pare pada jam aktif</li>
              <li>Perizinan jam malam</li>
              <li>Perizinan tidak mengikuti agenda wajib Markaz Arabiyah dan Markaz Turats</li>
              <li>Perizinan Check Out pertengahan duf’ah atau marhalah</li>
            </ul>
          </section>

          <section>
            <h4 className="font-bold text-slate-900 mb-2">2. Prosedur Perizinan Keluar Wilayah Pare dan Dalam Wilayah Pare (Jam Aktif)</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Santri datang langsung ke Maktab dan menemui General Manager atau Kepala Bagian Kedisiplinan dan Keamanan pada jam 11.30–13.00 WIB dan 16.30–17.00 WIB (Senin–Kamis), serta pukul 09.00 - 10.00 WIB atau 10.00 - 11.00 WIB (Jumat).</li>
              <li>Santri mengisi formulir perizinan yang telah disediakan.</li>
              <li>Santri wajib melakukan konfirmasi setelah kembali dan tiba di area Markaz Arabiyah dan Markaz Turats.</li>
              <li>Keterlambatan dalam melakukan konfirmasi akan dihitung sebagai pelanggaran dan dikenakan sanksi sesuai ketentuan yang berlaku.</li>
            </ul>
          </section>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 text-center shrink-0">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-xl font-bold hover:bg-[var(--color-primary-dark)] transition-colors text-sm"
          >
            Saya Mengerti
          </button>
        </div>
      </div>
    </div>
  );
}
