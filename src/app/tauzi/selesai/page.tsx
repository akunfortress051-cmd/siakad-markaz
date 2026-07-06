"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, LogOut } from "lucide-react";
import toast from "react-hot-toast";

export default function UjianSelesaiPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    fetch("/api/tauzi/hasil")
      .then(res => {
        if (res.status === 401) {
          router.push("/tauzi/login");
          return null;
        }
        return res.json();
      })
      .then(resData => {
        if (resData?.error) {
          toast.error(resData.error);
        } else if (resData) {
          setData(resData);
        }
      })
      .catch(() => toast.error("Gagal memuat hasil ujian"))
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/tauzi/auth/logout', { method: 'POST' });
      router.push('/tauzi/login');
      router.refresh();
    } catch {
      toast.error('Gagal keluar');
    }
  };

  if (loading) {
    return <div className="text-center py-20 font-bold text-gray-500">Memuat hasil ujian...</div>;
  }

  if (!data) return null;

  const totalPages = Math.ceil((data.breakdown?.length || 0) / ITEMS_PER_PAGE);
  const paginatedBreakdown = (data.breakdown || []).slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="pb-24 max-w-4xl mx-auto space-y-6">
      <div className="neu-card p-10 rounded-3xl text-center flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mb-6 text-[var(--color-primary)]">
          <CheckCircle2 size={48} />
        </div>
        <h2 className="text-3xl font-bold font-display mb-2 text-gray-800">Alhamdulillah, Selesai!</h2>
        <p className="text-gray-500 mb-6 font-medium max-w-md">
          Ujian Anda telah berhasil dikumpulkan. Berikut adalah rekapitulasi nilai Syafawi (Objektif) Anda.
        </p>

        <div className="flex flex-col md:flex-row items-center gap-6 w-full max-w-xl mx-auto mb-8 bg-gray-50 p-6 rounded-2xl border border-gray-100">
          <div className="flex-1 text-left">
            <h3 className="font-bold text-lg text-gray-800">{data.peserta?.nama}</h3>
            <p className="text-sm text-gray-500">NIS: {data.peserta?.nis}</p>
            <div className="mt-2 text-[var(--color-primary)] font-bold text-sm bg-[var(--color-primary-50)] px-3 py-1 rounded inline-block">
              Program {data.peserta?.program}
            </div>
          </div>
          <div className="h-20 w-px bg-gray-200 hidden md:block" />
          <div className="flex-shrink-0 text-center">
            <div className="text-sm text-gray-500 font-bold mb-1">NILAI AKHIR</div>
            <div className={`text-5xl font-black font-display ${data.nilaiSyafawi >= 70 ? 'text-[var(--color-primary)]' : 'text-orange-500'}`}>
              {data.nilaiSyafawi}
            </div>
          </div>
        </div>
        
        <button 
          onClick={handleLogout}
          className="px-8 py-3 rounded-xl font-bold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors flex items-center gap-2"
        >
          <LogOut size={18} /> Keluar dari Sesi
        </button>
      </div>

      <div>
        <h3 className="text-xl font-bold mb-4 px-2">Rincian Jawaban</h3>
        <div className="space-y-4">
          {paginatedBreakdown.map((soal: any, i: number) => (
            <div key={soal.id} className="neu-card p-6 rounded-2xl flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-shrink-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-sm ${soal.isCorrect ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                  {soal.isCorrect ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                </div>
              </div>
              <div className="flex-1 w-full">
                <div className="flex justify-between items-center mb-3">
                  <div className="text-sm font-bold text-gray-500">Pernyataan #{soal.urutan}</div>
                  <div className={`text-xs font-bold px-3 py-1 rounded-full ${soal.isCorrect ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                    {soal.isCorrect ? '+ Benar' : '- Salah'}
                  </div>
                </div>
                <h4 className="font-semibold text-gray-800 mb-4 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: soal.pertanyaan }} />
                
                <div className="space-y-2">
                  {soal.jawabanList.map((j: any, idx: number) => {
                    const isUserAns = j.id === soal.userAnswerId;
                    const isCorrectAns = j.isCorrect;
                    
                    let bgColor = 'bg-gray-50 border-gray-100 text-gray-500';
                    let mark = '';
                    
                    if (isCorrectAns) {
                      bgColor = 'bg-green-50 border-green-200 text-green-700 font-bold';
                      mark = ' (Kunci Jawaban)';
                    } else if (isUserAns && !isCorrectAns) {
                      bgColor = 'bg-red-50 border-red-200 text-red-700';
                      mark = ' (Jawaban Anda)';
                    }
                    
                    return (
                      <div key={j.id} className={`p-3 rounded-xl border flex gap-3 ${bgColor}`}>
                        <div className="font-bold shrink-0">{String.fromCharCode(65 + idx)}</div>
                        <div className="flex-1 whitespace-pre-wrap flex items-center gap-2" dangerouslySetInnerHTML={{ __html: j.teks + mark }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-6 px-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="px-4 py-2 font-bold bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition"
            >
              Sebelumnnya
            </button>
            <div className="text-sm font-bold text-gray-500">
              Halaman {currentPage} dari {totalPages}
            </div>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="px-4 py-2 font-bold bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition"
            >
              Berikutnya
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
