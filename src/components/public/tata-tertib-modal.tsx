"use client";

import { useState, useRef, useEffect } from "react";
import { XCircle, CheckSquare, Square, BookOpen, ChevronDown } from "lucide-react";

const PERATURAN = [
  {
    no: 1,
    judul: "Jenis Perizinan",
    isi: (
      <ul className="list-disc pl-5 space-y-1 mt-1">
        <li>Perizinan keluar wilayah Pare</li>
        <li>Perizinan dalam wilayah Pare pada jam aktif</li>
        <li>Perizinan jam malam</li>
        <li>Perizinan tidak mengikuti agenda wajib Markaz Arabiyah dan Markaz Turats</li>
        <li>Perizinan <em>Check Out</em> pertengahan duf&apos;ah atau marhalah</li>
      </ul>
    )
  },
  {
    no: 2,
    judul: "Prosedur Perizinan Keluar Wilayah Pare dan Dalam Wilayah Pare (Jam Aktif)",
    isi: (
      <ul className="list-disc pl-5 space-y-1 mt-1">
        <li>Santri datang langsung ke Maktab dan menemui General Manager atau Kepala Bagian Kedisiplinan dan Keamanan pada jam <strong>11.30–13.00 WIB</strong> dan <strong>16.30–17.00 WIB</strong> (Senin–Kamis), serta pukul <strong>09.00–10.00 WIB</strong> atau <strong>10.00–11.00 WIB</strong> (Jumat).</li>
        <li>Santri mengisi formulir perizinan yang telah disediakan.</li>
        <li>Santri wajib melakukan konfirmasi setelah kembali dan tiba di area Markaz Arabiyah dan Markaz Turats.</li>
        <li>Keterlambatan dalam melakukan konfirmasi akan dihitung sebagai pelanggaran dan dikenai sanksi kedisiplinan.</li>
      </ul>
    )
  },
  {
    no: 3,
    judul: "Perizinan Jam Malam dan Tidak Mengikuti Agenda Wajib",
    isi: (
      <p className="mt-1">Perizinan ini hanya diberikan jika terdapat <em>udzur syar&apos;i</em> yang dibuktikan dengan dokumen pendukung. Santri dapat menghubungi Kepala Bagian Kedisiplinan dan Keamanan melalui WhatsApp di nomor <strong>087730079154</strong>.</p>
    )
  },
  {
    no: 4,
    judul: "Pelanggaran Berat",
    isi: (
      <p className="mt-1">Keluar wilayah Pare dan tidak mengikuti kegiatan wajib Markaz Arabiyah dan Markaz Turats tanpa keterangan atau tanpa mengikuti prosedur perizinan yang berlaku dianggap sebagai <strong className="text-red-600">pelanggaran berat</strong>.</p>
    )
  },
  {
    no: 5,
    judul: "Perizinan Check Out Pertengahan Duf'ah atau Marhalah",
    isi: (
      <ul className="list-disc pl-5 space-y-1 mt-1">
        <li>Santri harus mengambil surat <em>check out</em> di kantor maktab Markaz.</li>
        <li>Santri wajib mendapatkan semua tanda tangan yang tercantum dalam surat <em>check out</em>.</li>
        <li>Surat <em>check out</em> diambil <strong>dua hari sebelum</strong> waktu keberangkatan.</li>
        <li>Santri yang keluar tanpa mengikuti prosedur <em>check out</em> akan langsung mendapatkan <strong className="text-red-600">SP 3 dan masuk daftar blacklist</strong>.</li>
        <li>Setelah memenuhi prosedur perizinan, santri diberi waktu <strong>1×24 jam</strong> untuk keluar dari sakan.</li>
      </ul>
    )
  },
  {
    no: 6,
    judul: "Larangan Perizinan Rihlah Sebelum Haflah",
    isi: (
      <p className="mt-1">Santri dilarang mengajukan perizinan untuk kegiatan rihlah sebelum pelaksanaan haflah.</p>
    )
  }
];

export default function TataTertibModal({
  onClose,
  requireAgreement = false
}: {
  onClose: () => void;
  requireAgreement?: boolean;
}) {
  const [agreed, setAgreed] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!requireAgreement) return;
    // Cek apakah konten sudah terlihat semua tanpa scroll (misal di layar besar)
    const el = contentRef.current;
    if (el) {
      if (el.scrollHeight <= el.clientHeight) {
        setHasScrolledToBottom(true);
      }
    }
  }, [requireAgreement]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (hasScrolledToBottom || !requireAgreement) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 20) {
      setHasScrolledToBottom(true);
    }
  };

  const handleConfirm = () => {
    if (requireAgreement && !agreed) return;
    if (requireAgreement) {
      localStorage.setItem("perizinan_agreed", "1");
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden relative max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 text-center relative shrink-0 bg-gradient-to-b from-emerald-50 to-white">
          {!requireAgreement && (
            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <XCircle size={24} />
            </button>
          )}
          <div className="flex justify-center mb-2">
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <BookOpen size={20} className="text-emerald-600" />
            </div>
          </div>
          <h3 className="font-black text-lg tracking-tight text-emerald-900 uppercase">
            Tata Tertib Perizinan Santri
          </h3>
          <p className="text-xs font-bold text-emerald-600 mt-0.5">
            Markaz Arabiyah &amp; Markaz Turats
          </p>
        </div>

        {/* Content */}
        <div 
          ref={contentRef}
          onScroll={handleScroll}
          className="p-5 overflow-y-auto space-y-5 text-sm leading-relaxed text-slate-700 flex-1 relative"
        >
          {PERATURAN.map((p) => (
            <section key={p.no} className="border border-slate-100 rounded-xl p-4 bg-slate-50">
              <h4 className="font-bold text-slate-900 mb-1 flex items-start gap-2">
                <span className="shrink-0 h-5 w-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black mt-0.5">{p.no}</span>
                {p.judul}
              </h4>
              <div className="text-slate-600">{p.isi}</div>
            </section>
          ))}

          {/* Arabic closing */}
          <div className="text-center text-slate-500 italic text-sm pt-2 border-t border-dashed border-slate-200">
            الإذن الذي يتم التعامل معه بشكل صحيح يعكس أخلاق وآداب الطالب الحقيقي ✨🙏🏻
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 shrink-0 space-y-3 relative">
          {requireAgreement && !hasScrolledToBottom && (
            <div className="absolute -top-12 left-0 w-full flex justify-center pointer-events-none">
              <div className="bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1 animate-bounce">
                <ChevronDown size={14} />
                Scroll ke bawah untuk membaca
              </div>
            </div>
          )}

          {requireAgreement && (
            <label className={`flex items-start gap-3 select-none ${hasScrolledToBottom ? "cursor-pointer group" : "opacity-50 cursor-not-allowed"}`}>
              <button
                type="button"
                onClick={() => {
                  if (hasScrolledToBottom) setAgreed(!agreed);
                }}
                disabled={!hasScrolledToBottom}
                className="shrink-0 mt-0.5 text-emerald-600 disabled:cursor-not-allowed"
              >
                {agreed
                  ? <CheckSquare size={22} className="text-emerald-600" />
                  : <Square size={22} className={`text-slate-400 ${hasScrolledToBottom ? "group-hover:text-slate-500" : ""}`} />
                }
              </button>
              <span className="text-sm font-semibold text-slate-700 leading-snug">
                Saya sudah membaca, memahami, dan <strong>siap menaati</strong> seluruh peraturan perizinan di Markaz Arabiyah &amp; Markaz Turats.
              </span>
            </label>
          )}

          <button
            onClick={handleConfirm}
            disabled={requireAgreement && !agreed}
            className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {requireAgreement ? "Saya Setuju & Lanjutkan" : "Tutup"}
          </button>
        </div>
      </div>
    </div>
  );
}
