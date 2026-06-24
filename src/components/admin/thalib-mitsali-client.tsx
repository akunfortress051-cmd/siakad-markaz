"use client";

import { useState, useEffect } from "react";
import { Trophy, Crown, Medal, Award, Loader2, Filter, Star, Sparkles } from "lucide-react";
import { toast } from "react-hot-toast";

type RankedStudent = {
  overallRank: number;
  nama: string;
  kelasNama: string;
  waliKelas: string;
  mapelScores: (number | "-")[];
  nilaiAkumulatif: number;
  gender: string;
};

type ProgramData = {
  programNama: string;
  mapelHeaders: string[];
  rankedStudents: RankedStudent[];
};

const USBU_OPTIONS = [
  { value: "1", label: "Usbu' 1" },
  { value: "2", label: "Usbu' 2" },
  { value: "3", label: "Nihai" },
  { value: "4", label: "Akumulatif" },
];

function getRankIcon(rank: number) {
  if (rank === 1) return <Crown className="h-5 w-5" style={{ color: "#FFD700" }} />;
  if (rank === 2) return <Medal className="h-5 w-5" style={{ color: "#C0C0C0" }} />;
  if (rank === 3) return <Award className="h-5 w-5" style={{ color: "#CD7F32" }} />;
  return null;
}

function getRankBadgeStyle(rank: number): React.CSSProperties {
  if (rank === 1) return { background: "linear-gradient(135deg, #FFD700, #FFA500)", color: "#7c4a00" };
  if (rank === 2) return { background: "linear-gradient(135deg, #E8E8E8, #C0C0C0)", color: "#4a4a4a" };
  if (rank === 3) return { background: "linear-gradient(135deg, #F4C088, #CD7F32)", color: "#5c3a12" };
  return { background: "var(--color-surface)", color: "var(--color-text-muted)" };
}

export function ThalibMitsaliClient() {
  const [usbu, setUsbu] = useState("1");
  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState<ProgramData[]>([]);

  const fetchData = async (targetUsbu: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/thalib-mitsali?usbu=${targetUsbu}`);
      if (!res.ok) throw new Error("Gagal mengambil data");
      const data = await res.json();
      setPrograms(data.programs || []);
    } catch (error) {
      console.error(error);
      toast.error("Gagal mengambil data Thalib Mitsali");
      setPrograms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(usbu);
  }, [usbu]);

  const usbuLabel = USBU_OPTIONS.find(o => o.value === usbu)?.label || "";

  // Collect ALL rank 1 across all programs
  const allRank1Students: (RankedStudent & { programNama: string; mapelHeaders: string[] })[] = [];
  for (const prog of programs) {
    for (const student of prog.rankedStudents) {
      allRank1Students.push({ ...student, programNama: prog.programNama, mapelHeaders: prog.mapelHeaders });
    }
  }

  // Sort by akumulatif descending
  allRank1Students.sort((a, b) => b.nilaiAkumulatif - a.nilaiAkumulatif);
  
  const highestScore = allRank1Students.length > 0 ? allRank1Students[0].nilaiAkumulatif : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center rounded-2xl p-3"
              style={{
                background: "linear-gradient(135deg, #006666, #008585)",
                boxShadow: "0 8px 32px rgba(0, 102, 102, 0.3)",
              }}
            >
              <Trophy className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black" style={{ color: "var(--color-text)" }}>
                Thalib Mitsali
              </h1>
              <p className="text-sm font-semibold" style={{ color: "var(--color-text-muted)" }}>
                طالب مثالي — Santri Teladan
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm" style={{ color: "var(--color-text-muted)" }}>
            Kumpulan peringkat 1 dari setiap kelas.
          </p>
        </div>

        {/* Filter Usbu' */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-bold" style={{ color: "var(--color-text-muted)" }}>
            <Filter className="h-4 w-4" />
            <span>Fase:</span>
          </div>
          <select
            id="usbu-filter"
            value={usbu}
            onChange={(e) => setUsbu(e.target.value)}
            className="rounded-2xl border px-5 py-3 text-sm font-bold outline-none transition"
            style={{
              borderColor: "var(--color-surface-dark)",
              background: "var(--color-secondary)",
              color: "var(--color-text)",
              boxShadow: "var(--shadow-inset-sm)",
            }}
          >
            {USBU_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div
            className="rounded-full p-5"
            style={{
              background: "linear-gradient(135deg, var(--color-primary-50), #ffffff)",
              boxShadow: "var(--shadow-raised)",
            }}
          >
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--color-primary)" }} />
          </div>
          <p className="text-sm font-bold" style={{ color: "var(--color-text-muted)" }}>
            Menghitung peringkat dari setiap kelas...
          </p>
        </div>
      )}

      {/* Empty state */}
      {!loading && allRank1Students.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 neu-card-white p-8">
          <Trophy className="h-12 w-12" style={{ color: "var(--color-text-subtle)" }} />
          <p className="text-lg font-bold" style={{ color: "var(--color-text-muted)" }}>
            Belum ada data nilai untuk {usbuLabel}
          </p>
          <p className="text-sm" style={{ color: "var(--color-text-subtle)" }}>
            Pastikan nilai sudah diinput untuk fase evaluasi yang dipilih.
          </p>
        </div>
      )}

      {/* Grid of All Rank 1 Students */}
      {!loading && allRank1Students.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {allRank1Students.map((student, idx) => {
            const isTop1 = student.nilaiAkumulatif === highestScore;

            return isTop1 ? (
              // Premium Card for Highest Scorer(s)
              <div
                key={`student-${idx}`}
                className="relative overflow-hidden rounded-3xl p-6"
                style={{
                  background: "linear-gradient(135deg, #006666 0%, #008585 50%, #00a3a3 100%)",
                  boxShadow: "0 12px 40px rgba(0, 102, 102, 0.35)",
                }}
              >
                {/* Decorative sparkle */}
                <div className="absolute top-3 right-3 opacity-20">
                  <Sparkles className="h-20 w-20 text-white" />
                </div>

                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div
                        className="flex items-center justify-center rounded-xl p-2"
                        style={{ background: "rgba(255,215,0, 0.2)" }}
                      >
                        <Crown className="h-5 w-5" style={{ color: "#FFD700" }} />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest text-white opacity-80">
                        JUARA UMUM TERTINGGI
                      </span>
                    </div>

                    <h3 className="text-2xl font-black text-white mb-1 truncate" title={student.nama}>
                      {student.nama}
                    </h3>
                    <p className="text-sm font-semibold text-white opacity-70 mb-4 line-clamp-2">
                      {student.programNama} • {student.kelasNama}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <div>
                      <p className="text-xs font-bold text-white opacity-60 uppercase tracking-wider">
                        Nilai Akumulatif
                      </p>
                      <p className="text-3xl font-black text-white">
                        {Number.isInteger(student.nilaiAkumulatif) ? student.nilaiAkumulatif : student.nilaiAkumulatif.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Detail Nilai Pecahan (Mapel) */}
                  <div className="mt-5 border-t border-white/20 pt-4">
                    <p className="text-[10px] font-bold text-white opacity-70 uppercase tracking-wider mb-2">
                      Rincian Nilai Mapel
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {student.mapelHeaders.map((header, i) => {
                        const score = student.mapelScores[i];
                        const validScores = student.mapelScores.filter((s): s is number => typeof s === "number");
                        const maxScore = validScores.length > 0 ? Math.max(...validScores) : null;
                        const isMax = score !== "-" && score === maxScore;

                        return (
                          <div
                            key={i}
                            className="flex flex-col items-center justify-center rounded-lg p-2 text-center transition-colors"
                            style={{
                              background: isMax ? "rgba(255, 215, 0, 0.2)" : "rgba(255, 255, 255, 0.1)",
                              border: isMax ? "1px solid rgba(255, 215, 0, 0.4)" : "1px solid transparent",
                            }}
                          >
                            <span
                              className="w-full truncate text-[9px] font-bold uppercase opacity-80"
                              style={{ color: isMax ? "#FFD700" : "white" }}
                              title={header}
                            >
                              {header}
                            </span>
                            <div className="flex items-center gap-1">
                              <span
                                className="text-sm font-black"
                                style={{ color: isMax ? "#FFD700" : "white" }}
                              >
                                {typeof score === "number" ? (Number.isInteger(score) ? score : score.toFixed(2)) : score ?? "-"}
                              </span>
                              {isMax && <Star className="h-2.5 w-2.5" style={{ fill: "#FFD700", color: "#FFD700" }} />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Regular Rank 1 Card
              <div
                key={`student-${idx}`}
                className="relative overflow-hidden rounded-3xl p-6 neu-card-white flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div
                      className="flex items-center justify-center rounded-xl p-2"
                      style={{ background: "var(--color-primary-50)" }}
                    >
                      <Trophy className="h-5 w-5" style={{ color: "var(--color-primary)" }} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-primary)" }}>
                      RANK 1 KELAS
                    </span>
                  </div>

                  <h3 className="text-xl font-black mb-1 truncate" title={student.nama} style={{ color: "var(--color-text)" }}>
                    {student.nama}
                  </h3>
                  <p className="text-sm font-semibold mb-4 line-clamp-2" style={{ color: "var(--color-text-muted)" }}>
                    {student.programNama} • {student.kelasNama}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-subtle)" }}>
                      Nilai Akumulatif
                    </p>
                    <p className="text-2xl font-black" style={{ color: "var(--color-text)" }}>
                      {Number.isInteger(student.nilaiAkumulatif) ? student.nilaiAkumulatif : student.nilaiAkumulatif.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Detail Nilai Pecahan (Mapel) */}
                <div className="mt-5 border-t border-[var(--color-surface-dark)] pt-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-subtle)" }}>
                    Rincian Nilai Mapel
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {student.mapelHeaders.map((header, i) => {
                      const score = student.mapelScores[i];
                      const validScores = student.mapelScores.filter((s): s is number => typeof s === "number");
                      const maxScore = validScores.length > 0 ? Math.max(...validScores) : null;
                      const isMax = score !== "-" && score === maxScore;

                      return (
                        <div
                          key={i}
                          className="flex flex-col items-center justify-center rounded-lg p-2 text-center transition-colors"
                          style={{
                            background: isMax ? "var(--color-success-light)" : "var(--color-surface)",
                            border: isMax ? "1px solid var(--color-success)" : "1px solid transparent",
                          }}
                        >
                          <span
                            className="w-full truncate text-[9px] font-bold uppercase"
                            style={{ color: isMax ? "var(--color-success)" : "var(--color-text-subtle)" }}
                            title={header}
                          >
                            {header}
                          </span>
                          <div className="flex items-center gap-1">
                            <span
                              className="text-sm font-black"
                              style={{ color: isMax ? "var(--color-success)" : "var(--color-text)" }}
                            >
                              {typeof score === "number" ? (Number.isInteger(score) ? score : score.toFixed(2)) : score ?? "-"}
                            </span>
                            {isMax && <Star className="h-2.5 w-2.5" style={{ fill: "var(--color-warning)", color: "var(--color-warning)" }} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
