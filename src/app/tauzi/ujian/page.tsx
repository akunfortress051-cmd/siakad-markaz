"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function UjianTauziPage() {
  const router = useRouter();
  const [soalList, setSoalList] = useState<any[]>([]);
  const [peserta, setPeserta] = useState<{ nama: string; nis: string; program: string } | null>(null);
  const [answers, setAnswers] = useState<{ [soalId: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetch("/api/tauzi/soal")
      .then(res => {
        if (res.status === 403) {
          router.push("/tauzi/selesai");
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (data && data.soalList) {
          setSoalList(data.soalList);
          setPeserta(data.peserta);
        } else if (data?.error) {
          toast.error(data.error);
        } else if (Array.isArray(data)) {
          // Fallback if API hasn't been updated yet
          setSoalList(data);
        }
      })
      .catch(() => toast.error("Gagal load soal"))
      .finally(() => setLoading(false));
  }, [router]);

  const handleSelectAnswer = (soalId: string, jawabanId: string) => {
    setAnswers(prev => ({ ...prev, [soalId]: jawabanId }));
  };

  const isAllAnswered = Object.keys(answers).length === soalList.length;

  const handleSubmit = async () => {
    if (!isAllAnswered) return;
    
    if (!confirm("Apakah Anda yakin telah selesai dan ingin mengumpulkan jawaban?")) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/tauzi/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jawaban: answers })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      router.push("/tauzi/selesai");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Gagal mengumpulkan jawaban");
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < soalList.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  if (loading) return <div className="text-center py-20 font-bold text-gray-500">Mempersiapkan Lembar Soal...</div>;
  
  if (soalList.length === 0) {
    return (
      <div className="neu-card p-10 mt-10 rounded-3xl text-center">
        <h2 className="text-xl font-bold mb-2">Mohon Maaf</h2>
        <p className="text-gray-500">Soal untuk program Anda belum tersedia. Silakan hubungi pengajar.</p>
      </div>
    );
  }

  const currentSoal = soalList[currentIndex];

  return (
    <div className="pb-24 max-w-3xl mx-auto">
      {/* Profil Santri */}
      {peserta && (
        <div className="mb-6 neu-card p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 border-l-[var(--color-primary)]">
          <div>
            <h3 className="font-bold text-lg text-gray-800">{peserta.nama}</h3>
            <p className="text-sm text-gray-500">NIS: {peserta.nis}</p>
          </div>
          <div className="bg-[var(--color-primary-50)] text-[var(--color-primary)] px-4 py-2 rounded-xl font-bold text-sm text-center">
            Program {peserta.program}
          </div>
        </div>
      )}

      {/* Konten Soal (Pagination Wizard) */}
      <div className="neu-card p-5 md:p-7 rounded-2xl transition-all min-h-[400px] flex flex-col justify-between relative overflow-hidden">
        <div>
          {/* Progress Bar atas */}
          <div className="w-full bg-gray-100 h-2 rounded-full mb-6">
            <div 
              className="h-2 rounded-full bg-[var(--color-primary)] transition-all duration-300" 
              style={{ width: `${((currentIndex + 1) / soalList.length) * 100}%` }}
            />
          </div>

          <div className="flex gap-4 items-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-[var(--color-primary-50)] text-[var(--color-primary)]">
              {currentIndex + 1}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-[16px] leading-relaxed mb-6 text-gray-800 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: currentSoal.pertanyaan }} />
              
              <div className="space-y-3">
                {currentSoal.jawabanList.map((j: any, i: number) => {
                  const isSelected = answers[currentSoal.id] === j.id;
                  return (
                    <label 
                      key={j.id} 
                      className={`p-4 rounded-xl border-2 flex gap-3 items-center cursor-pointer transition-colors ${isSelected ? 'border-[var(--color-primary)] bg-[var(--color-primary-50)]' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                    >
                      <input 
                        type="radio" 
                        name={`soal_${currentSoal.id}`} 
                        value={j.id} 
                        checked={isSelected}
                        onChange={() => {
                          handleSelectAnswer(currentSoal.id, j.id);
                          // Otomatis lanjut jika bukan soal terakhir
                          if (currentIndex < soalList.length - 1) {
                            setTimeout(handleNext, 300);
                          }
                        }}
                        className="w-5 h-5 hidden"
                      />
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center border text-[12px] font-bold transition-colors shrink-0 ${isSelected ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white' : 'border-gray-300 text-gray-400'}`}>
                        {String.fromCharCode(65 + i)}
                      </div>
                      <span className={`flex-1 font-medium text-sm ${isSelected ? 'text-[var(--color-primary)]' : 'text-gray-700'}`} dangerouslySetInnerHTML={{ __html: j.teks }} />
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Tombol Lanjut & Kembali */}
        <div className="flex justify-between items-center mt-10 pt-4 border-t border-gray-100">
          <button 
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className={`px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all ${currentIndex === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100 bg-gray-50'}`}
          >
            ← Kembali
          </button>
          
          <button 
            onClick={handleNext}
            disabled={currentIndex === soalList.length - 1}
            className={`px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all ${currentIndex === soalList.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'bg-[var(--color-primary-50)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white'}`}
          >
            Lanjut →
          </button>
        </div>
      </div>

      {/* Floating Bottom Bar (Submit) */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t p-4 z-40 flex justify-center shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
        <div className="w-full max-w-3xl flex justify-between items-center">
          <div className="text-xs font-bold text-gray-500">
            Terjawab: <span className="text-[var(--color-primary)]">{Object.keys(answers).length}</span> / {soalList.length}
          </div>
          <button 
            onClick={handleSubmit}
            disabled={submitting || !isAllAnswered}
            className={`px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${(!isAllAnswered || submitting) ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'neu-button-primary'}`}
          >
            {submitting ? "Kumpulkan..." : (isAllAnswered ? "Kumpulkan" : "Belum Selesai")}
          </button>
        </div>
      </div>
    </div>
  );
}
