"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { CheckCircle2, AlertCircle, Save, LayoutGrid, ChevronRight, ChevronLeft, Flag, X } from "lucide-react";

export default function UjianTauziCBTPage() {
  const router = useRouter();
  const [soalList, setSoalList] = useState<any[]>([]);
  const [peserta, setPeserta] = useState<{ nama: string; nis: string; program: string } | null>(null);

  // Format answers: { [soalId]: { jawabanId: string | null, ragu: boolean } }
  const [answers, setAnswers] = useState<{ [soalId: string]: { jawabanId: string | null, ragu: boolean } }>({});
  const answersRef = useRef(answers);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [savingStatus, setSavingStatus] = useState<"idle" | "saving" | "error">("idle");
  const lastSavedRef = useRef<string>("");

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

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

          if (data.savedResponses) {
            setAnswers(data.savedResponses);
            lastSavedRef.current = JSON.stringify(data.savedResponses);
          }
        } else if (data?.error) {
          toast.error(data.error);
        } else if (Array.isArray(data)) {
          setSoalList(data);
        }
      })
      .catch(() => toast.error("Gagal memuat soal"))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    const disableContextMenu = (e: any) => {
      e.preventDefault();
      toast.error("Klik kanan dinonaktifkan", { position: 'top-right' });
    };

    const disableShortcuts = (e: any) => {
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J")) ||
        (e.ctrlKey && e.key === "U") ||
        (e.ctrlKey && e.key === "c") ||
        (e.ctrlKey && e.key === "v") ||
        (e.ctrlKey && e.key === "p") ||
        e.key === "PrintScreen"
      ) {
        e.preventDefault();
      }
    };

    document.addEventListener("contextmenu", disableContextMenu);
    document.addEventListener("keydown", disableShortcuts);
    document.addEventListener("copy", (e) => e.preventDefault());
    document.addEventListener("cut", (e) => e.preventDefault());
    document.addEventListener("paste", (e) => e.preventDefault());

    return () => {
      document.removeEventListener("contextmenu", disableContextMenu);
      document.removeEventListener("keydown", disableShortcuts);
      document.removeEventListener("copy", (e) => e.preventDefault());
      document.removeEventListener("cut", (e) => e.preventDefault());
      document.removeEventListener("paste", (e) => e.preventDefault());
    };
  }, []);

  useEffect(() => {
    if (soalList.length === 0) return;

    const autoSave = async () => {
      if (Object.keys(answersRef.current).length === 0) return;

      const currentAnswersStr = JSON.stringify(answersRef.current);
      if (currentAnswersStr === lastSavedRef.current) return;

      setSavingStatus("saving");
      try {
        const res = await fetch("/api/tauzi/autosave", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jawaban: answersRef.current })
        });
        if (res.ok) {
          setLastSaved(new Date());
          setSavingStatus("idle");
          lastSavedRef.current = currentAnswersStr;
        } else {
          setSavingStatus("error");
        }
      } catch {
        setSavingStatus("error");
      }
    };

    const interval = setInterval(autoSave, 15000);
    return () => clearInterval(interval);
  }, [soalList.length]);

  const handleSelectAnswer = (soalId: string, jawabanId: string) => {
    setAnswers(prev => ({
      ...prev,
      [soalId]: { ...prev[soalId], jawabanId, ragu: prev[soalId]?.ragu || false }
    }));
  };

  const toggleRagu = (soalId: string) => {
    setAnswers(prev => ({
      ...prev,
      [soalId]: {
        ...prev[soalId],
        ragu: !prev[soalId]?.ragu,
        jawabanId: prev[soalId]?.jawabanId || null
      }
    }));
  };

  const getAnsweredCount = () => {
    return soalList.filter(s => {
      const a = answers[s.id];
      return a && a.jawabanId !== null && a.jawabanId !== undefined;
    }).length;
  };

  const isAllAnswered = soalList.length > 0 && getAnsweredCount() === soalList.length;
  const raguCount = soalList.filter(s => answers[s.id]?.ragu).length;
  const isReadyToSubmit = isAllAnswered && raguCount === 0;

  const handleSubmit = async () => {
    if (!isReadyToSubmit) return;
    if (!confirm("Apakah Anda yakin telah selesai dan ingin mengumpulkan jawaban?")) return;

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

  if (loading) return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-100">
      <div className="flex flex-col items-center bg-white border border-slate-300 rounded px-10 py-8">
        <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-[var(--color-primary)] animate-spin mb-4" />
        <p className="text-slate-600 font-semibold text-sm">Menyiapkan Lembar Ujian...</p>
      </div>
    </div>
  );

  if (soalList.length === 0) return (
    <div className="flex justify-center py-20 px-4 items-center bg-slate-100 min-h-screen">
      <div className="bg-white rounded border border-slate-300 p-8 max-w-sm text-center">
        <h2 className="text-lg font-bold text-slate-800 mb-2">Soal Belum Tersedia</h2>
        <p className="text-slate-500 text-sm">Silakan hubungi administrator atau muwajjih setempat.</p>
      </div>
    </div>
  );

  const currentSoal = soalList[currentIndex];
  const answeredCount = getAnsweredCount();

  const getNavStyle = (idx: number) => {
    const isCurrent = currentIndex === idx;
    const ans = answers[soalList[idx].id];

    let base = "border text-xs font-bold transition-colors duration-150 rounded-sm ";

    if (ans?.ragu) {
      base += "bg-amber-50 border-amber-500 text-amber-700 hover:bg-amber-100 ";
    } else if (ans?.jawabanId) {
      base += "bg-emerald-50 border-emerald-600 text-emerald-700 hover:bg-emerald-100 ";
    } else {
      base += "bg-white border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-slate-400 ";
    }

    if (isCurrent) {
      base += "ring-2 ring-offset-1 ring-[var(--color-primary)] ";
    }

    return base;
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans selection:bg-transparent flex flex-col" onContextMenu={e => e.preventDefault()}>

      {/* HEADER: institutional two-tier bar */}
      <header className="sticky top-0 z-50 shadow-md">
        {/* Tier 1: identity/brand bar */}
        <div className="bg-[var(--color-primary)] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/15 border border-white/25 w-9 h-9 rounded-sm flex items-center justify-center font-bold text-xs tracking-wide">
                CBT
              </div>
              <div className="leading-tight">
                <h1 className="font-bold text-sm sm:text-base uppercase tracking-wide">Ujian Berbasis Komputer</h1>
                <p className="text-[11px] text-white/75 font-medium">Sistem Ujian Online Tauzi</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* SAVING INDICATOR */}
              <div className="hidden md:flex items-center gap-1.5 text-xs font-semibold bg-white/10 border border-white/20 px-3 py-1.5 rounded-sm">
                {savingStatus === "saving" && <><Save size={13} className="animate-pulse" /> <span>Menyimpan...</span></>}
                {savingStatus === "error" && <><AlertCircle size={13} className="text-red-300" /> <span className="text-red-200">Gagal menyimpan</span></>}
                {savingStatus === "idle" && lastSaved && <><CheckCircle2 size={13} /> <span>Tersimpan {lastSaved.getHours().toString().padStart(2, '0')}:{lastSaved.getMinutes().toString().padStart(2, '0')}</span></>}
                {savingStatus === "idle" && !lastSaved && <><CheckCircle2 size={13} /> <span>Tersinkronisasi</span></>}
              </div>

              {/* MOBILE NAV TOGGLE */}
              <button
                onClick={() => setIsNavOpen(!isNavOpen)}
                className="lg:hidden p-2 bg-white/10 border border-white/20 rounded-sm text-white hover:bg-white/20 transition-colors"
              >
                <LayoutGrid size={17} />
              </button>
            </div>
          </div>
        </div>

        {/* Tier 2: peserta identity strip */}
        <div className="bg-white border-b border-slate-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs sm:text-[13px]">
            <div>
              <span className="text-slate-400 font-semibold uppercase tracking-wide mr-1.5">Nama</span>
              <span className="font-bold text-slate-800">{peserta?.nama}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold uppercase tracking-wide mr-1.5">No. Peserta</span>
              <span className="font-bold text-slate-800">{peserta?.nis}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold uppercase tracking-wide mr-1.5">Program</span>
              <span className="font-bold text-slate-800">{peserta?.program}</span>
            </div>
            {/* Saving indicator, mobile only */}
            <div className="md:hidden ml-auto flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
              {savingStatus === "saving" && <><Save size={12} className="text-blue-500 animate-pulse" /> Menyimpan...</>}
              {savingStatus === "error" && <><AlertCircle size={12} className="text-red-500" /> Gagal simpan</>}
              {savingStatus === "idle" && <><CheckCircle2 size={12} className="text-emerald-600" /> Tersimpan</>}
            </div>
          </div>
        </div>
      </header>

      {/* MAIN EXAM STAGE */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-5 pb-24 lg:pb-10 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start relative">

        {/* LEFT COLUMN: QUESTION AREA */}
        <div className="lg:col-span-8 flex flex-col gap-4">

          {/* QUESTION BOX */}
          <div className="bg-white border border-slate-300 rounded shadow-sm">
            {/* Header bar */}
            <div className="flex justify-between items-center px-5 py-3 border-b border-slate-200 bg-slate-50 rounded-t">
              <span className="font-bold text-slate-700 text-sm tracking-wide">
                SOAL NOMOR {currentIndex + 1} <span className="text-slate-400 font-medium">/ {soalList.length}</span>
              </span>

              <label className="flex items-center gap-2 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={!!answers[currentSoal.id]?.ragu}
                  onChange={() => toggleRagu(currentSoal.id)}
                  className="w-4 h-4 accent-amber-500 border-slate-400 rounded-sm cursor-pointer"
                />
                <span className={`text-xs font-bold uppercase tracking-wide flex items-center gap-1 ${answers[currentSoal.id]?.ragu ? 'text-amber-600' : 'text-slate-500 group-hover:text-slate-700'}`}>
                  <Flag size={13} className={answers[currentSoal.id]?.ragu ? 'fill-amber-400 text-amber-500' : ''} />
                  Ragu-ragu
                </span>
              </label>
            </div>

            <div className="p-5 sm:p-8">
              {/* The Arabic Question */}
              <div
                dir="rtl"
                className="mb-8 bg-slate-50 border border-slate-200 rounded-sm p-5 sm:p-6 font-serif text-2xl sm:text-3xl leading-[2.2] text-slate-800 selection:bg-transparent"
                style={{ fontFamily: "'Amiri', 'Traditional Arabic', serif" }}
                dangerouslySetInnerHTML={{ __html: currentSoal.pertanyaan }}
              />

              {/* Answer Options */}
              <div className="space-y-2.5">
                {currentSoal.jawabanList.map((j: any, i: number) => {
                  const isSelected = answers[currentSoal.id]?.jawabanId === j.id;
                  return (
                    <label
                      key={j.id}
                      dir="rtl"
                      className={`flex items-center gap-4 px-4 sm:px-5 py-3.5 rounded-sm border cursor-pointer transition-colors duration-150 ${isSelected
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary-50)]'
                          : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                        }`}
                    >
                      <input
                        type="radio"
                        name={`soal_${currentSoal.id}`}
                        value={j.id}
                        checked={isSelected}
                        onChange={() => {
                          handleSelectAnswer(currentSoal.id, j.id);
                          if (currentIndex < soalList.length - 1 && !answers[currentSoal.id]?.ragu) {
                            setTimeout(() => setCurrentIndex(prev => prev + 1), 600);
                          }
                        }}
                        className="peer hidden"
                      />

                      <div className={`flex-shrink-0 w-7 h-7 rounded-sm border flex items-center justify-center font-bold text-xs ${isSelected
                          ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white'
                          : 'border-slate-300 text-slate-500 bg-white'
                        }`}>
                        {String.fromCharCode(65 + i)}
                      </div>

                      <div
                        className={`flex-1 font-serif text-xl sm:text-2xl leading-loose ${isSelected ? 'text-slate-900 font-medium' : 'text-slate-700'
                          }`}
                        style={{ fontFamily: "'Amiri', 'Traditional Arabic', serif" }}
                        dangerouslySetInnerHTML={{ __html: j.teks }}
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* PREV/NEXT NAVIGATION BAR */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-sm font-bold text-xs sm:text-sm border transition-colors ${currentIndex === 0
                  ? 'text-slate-300 bg-slate-100 border-slate-200 cursor-not-allowed'
                  : 'text-slate-700 bg-white border-slate-300 hover:bg-slate-50'
                }`}
            >
              <ChevronLeft size={16} /> <span>Sebelumnya</span>
            </button>

            <button
              onClick={() => setCurrentIndex(prev => Math.min(soalList.length - 1, prev + 1))}
              disabled={currentIndex === soalList.length - 1}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-sm font-bold text-xs sm:text-sm transition-colors ${currentIndex === soalList.length - 1
                  ? 'text-slate-300 bg-slate-100 cursor-not-allowed'
                  : 'text-white bg-[var(--color-primary)] hover:opacity-90'
                }`}
            >
              <span>Selanjutnya</span> <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: NAV PANEL */}
        <div className={`fixed lg:sticky top-0 right-0 h-[100dvh] lg:h-auto z-[60] lg:z-10 w-[300px] lg:w-full lg:col-span-4 bg-white lg:bg-transparent p-4 lg:p-0 border-l border-slate-300 lg:border-none shadow-2xl lg:shadow-none transition-transform duration-300 ease-out flex flex-col ${isNavOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
          }`}>

          <div className="flex items-center justify-between mb-4 lg:hidden">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide flex items-center gap-2">
              <LayoutGrid size={16} className="text-slate-400" /> Navigasi Soal
            </h3>
            <button onClick={() => setIsNavOpen(false)} className="p-1.5 bg-slate-100 border border-slate-300 rounded-sm text-slate-500 hover:bg-slate-200">
              <X size={16} />
            </button>
          </div>

          <div className="bg-white lg:border lg:border-slate-300 lg:rounded lg:shadow-sm flex-1 flex flex-col min-h-0">
            {/* Header bar */}
            <div className="px-5 py-3 border-b border-slate-200 bg-[var(--color-primary)] text-white lg:rounded-t hidden lg:flex items-center justify-between shrink-0">
              <span className="font-bold text-sm uppercase tracking-wide">Navigasi Soal</span>
              <span className="bg-white/15 border border-white/25 font-bold px-2.5 py-1 rounded-sm text-xs">
                {answeredCount} / {soalList.length}
              </span>
            </div>

            {/* Progress bar */}
            <div className="px-5 pt-4 pb-3 border-b border-slate-100 shrink-0">
              <div className="w-full bg-slate-200 h-1.5 rounded-sm overflow-hidden">
                <div
                  className="h-full bg-emerald-600 transition-all duration-500 ease-out"
                  style={{ width: `${(answeredCount / soalList.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Grid Soal scrollable */}
            <div className="p-5 overflow-y-auto shrink-1 border-b border-slate-100 hide-scrollbar" style={{ maxHeight: "calc(100vh - 380px)" }}>
              <div className="grid grid-cols-5 gap-2">
                {soalList.map((s, idx) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setCurrentIndex(idx);
                      if (window.innerWidth < 1024) setIsNavOpen(false);
                    }}
                    className={`w-full aspect-square flex items-center justify-center ${getNavStyle(idx)}`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Legend & Submit button bottom pinned */}
            <div className="p-5 shrink-0 bg-slate-50 lg:rounded-b">
              <div className="flex flex-col gap-1.5 text-[11px] font-semibold text-slate-600 mb-4 uppercase tracking-wide">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-emerald-50 border border-emerald-600" /> Terjawab</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-amber-50 border border-amber-500" /> Ragu-ragu</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-white border border-slate-300" /> Belum Dijawab</div>
              </div>

              {isReadyToSubmit ? (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className={`w-full py-3 rounded-sm font-bold text-sm uppercase tracking-wide flex items-center justify-center gap-2 transition-colors border ${
                    submitting
                      ? 'bg-slate-200 text-slate-400 border-slate-200 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white'
                  }`}
                >
                  {submitting ? "Memproses..." : "Selesai Ujian"}
                </button>
              ) : (
                <div className="w-full py-2.5 rounded-sm border border-slate-200 bg-slate-100 text-[10px] leading-relaxed text-slate-500 font-bold uppercase tracking-wide flex items-center justify-center text-center px-4">
                  Selesaikan {soalList.length - getAnsweredCount()} soal & hilangkan {raguCount} ragu-ragu
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* MOBILE BOTTOM FLOAT ACTION BAR */}
        <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 p-4 z-[50] lg:hidden flex justify-between items-center shadow-[0_-4px_15px_rgba(0,0,0,0.05)]">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Progress</span>
            <span className="text-sm font-bold text-slate-800">{answeredCount} / {soalList.length} Terjawab</span>
          </div>
          <button 
            onClick={() => setIsNavOpen(true)}
            className="bg-slate-800 text-white px-5 py-2.5 rounded-sm font-bold text-xs flex items-center gap-2 uppercase tracking-wide shadow-md active:scale-95 transition-transform"
          >
            <LayoutGrid size={15} /> Daftar Navigasi
          </button>
        </div>

        {/* Mobile Nav Backdrop */}
        {isNavOpen && (
          <div
            className="fixed inset-0 bg-slate-900/40 z-50 lg:hidden transition-opacity"
            onClick={() => setIsNavOpen(false)}
          />
        )}
      </main>

      <style dangerouslySetInnerHTML={{
        __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}