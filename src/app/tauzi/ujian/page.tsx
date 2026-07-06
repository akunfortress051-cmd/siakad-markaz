"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function UjianTauziPage() {
  const router = useRouter();
  const [soalList, setSoalList] = useState<any[]>([]);
  const [answers, setAnswers] = useState<{ [soalId: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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
        if (data && !data.error) setSoalList(data);
        else if (data?.error) toast.error(data.error);
      })
      .catch(() => toast.error("Gagal load soal"))
      .finally(() => setLoading(false));
  }, [router]);

  const handleSelectAnswer = (soalId: string, jawabanId: string) => {
    setAnswers(prev => ({ ...prev, [soalId]: jawabanId }));
  };

  const handleSubmit = async () => {
    const unanswered = soalList.filter(s => !answers[s.id]);
    if (unanswered.length > 0) {
      if (!confirm(`Ada ${unanswered.length} soal yang belum dijawab. Yakin ingin mengumpulkan?`)) {
        return;
      }
    } else {
      if (!confirm("Apakah Anda yakin telah selesai dan ingin mengumpulkan jawaban?")) {
        return;
      }
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

  if (loading) return <div className="text-center py-20 font-bold text-gray-500">Mempersiapkan Lembar Soal...</div>;
  
  if (soalList.length === 0) {
    return (
      <div className="neu-card p-10 mt-10 rounded-3xl text-center">
        <h2 className="text-xl font-bold mb-2">Mohon Maaf</h2>
        <p className="text-gray-500">Soal untuk program Anda belum tersedia. Silakan hubungi pengajar.</p>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <div className="mb-6">
        <h2 className="text-xl font-bold font-display" style={{ color: "var(--color-text)" }}>Lembar Soal Syafawi</h2>
        <p className="text-xs text-gray-500 mt-1 font-semibold">Pilih jawaban yang menurut Anda paling benar.</p>
      </div>

      <div className="space-y-6">
        {soalList.map((soal) => (
          <div key={soal.id} className="neu-card p-5 md:p-7 rounded-2xl transition-all">
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-gray-100 text-gray-500">
                {soal.urutan}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[15px] leading-relaxed mb-4 text-gray-800 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: soal.pertanyaan }} />
                
                <div className="space-y-2.5">
                  {soal.jawabanList.map((j: any, i: number) => {
                    const isSelected = answers[soal.id] === j.id;
                    return (
                      <label 
                        key={j.id} 
                        className={`p-3.5 rounded-xl border-2 flex gap-3 items-center cursor-pointer transition-colors ${isSelected ? 'border-[var(--color-primary)] bg-[var(--color-primary-50)]' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                      >
                        <input 
                          type="radio" 
                          name={`soal_${soal.id}`} 
                          value={j.id} 
                          checked={isSelected}
                          onChange={() => handleSelectAnswer(soal.id, j.id)}
                          className="w-5 h-5 hidden"
                        />
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center border text-[12px] font-bold transition-colors ${isSelected ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white' : 'border-gray-300 text-gray-400'}`}>
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
        ))}
      </div>

      <div className="fixed bottom-0 left-0 w-full bg-white border-t p-4 z-40 flex justify-center" style={{ borderColor: "var(--color-surface-hover)" }}>
        <div className="w-full max-w-3xl flex justify-between items-center">
          <div className="text-xs font-bold text-gray-500">
            Terjawab: <span className="text-[var(--color-primary)]">{Object.keys(answers).length}</span> / {soalList.length}
          </div>
          <button 
            onClick={handleSubmit}
            disabled={submitting}
            className="neu-button-primary px-8 py-3 rounded-xl font-bold flex items-center gap-2"
          >
            {submitting ? "Menyimpan..." : "Kumpulkan"}
          </button>
        </div>
      </div>
    </div>
  );
}
