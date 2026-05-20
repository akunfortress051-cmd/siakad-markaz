"use client";

type StackedProgressBarProps = {
  hadir: number;
  izin: number;
  sakit: number;
  alpha: number;
  showLabels?: boolean;
  height?: string;
};

const SEGMENTS = [
  { key: "hadir", label: "Hadir", color: "bg-emerald-500", textColor: "text-emerald-700" },
  { key: "izin", label: "Izin", color: "bg-indigo-500", textColor: "text-indigo-700" },
  { key: "sakit", label: "Sakit", color: "bg-amber-500", textColor: "text-amber-700" },
  { key: "alpha", label: "Alfa", color: "bg-rose-500", textColor: "text-rose-700" },
] as const;

export function StackedProgressBar({
  hadir,
  izin,
  sakit,
  alpha,
  showLabels = true,
  height = "h-3",
}: StackedProgressBarProps) {
  const total = hadir + izin + sakit + alpha;
  if (total === 0) {
    return (
      <div className="space-y-1.5">
        <div className={`w-full ${height} rounded-full bg-slate-100 overflow-hidden`} />
        {showLabels && (
          <p className="text-[11px] font-semibold text-slate-400 text-center">Belum ada data</p>
        )}
      </div>
    );
  }

  const values: Record<string, number> = { hadir, izin, sakit, alpha };

  return (
    <div className="space-y-1.5">
      {/* Bar */}
      <div className={`w-full ${height} rounded-full bg-slate-100 overflow-hidden flex`}>
        {SEGMENTS.map((seg) => {
          const val = values[seg.key];
          if (val === 0) return null;
          const pct = (val / total) * 100;
          return (
            <div
              key={seg.key}
              className={`${seg.color} transition-all duration-500 first:rounded-l-full last:rounded-r-full`}
              style={{ width: `${pct}%` }}
              title={`${seg.label}: ${val} (${Math.round(pct)}%)`}
            />
          );
        })}
      </div>

      {/* Labels */}
      {showLabels && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          {SEGMENTS.map((seg) => {
            const val = values[seg.key];
            if (val === 0) return null;
            const pct = Math.round((val / total) * 100);
            return (
              <span key={seg.key} className={`text-[11px] font-bold ${seg.textColor} flex items-center gap-1`}>
                <span className={`inline-block h-2 w-2 rounded-full ${seg.color}`} />
                {seg.label} {val} ({pct}%)
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
