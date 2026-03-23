"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { ChevronLeft, FileText, ChevronDown, ChevronRight, Search } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

type SantriDetail = {
  id: string;
  riwayatId: string;
  namaSantri: string;
  sakan: string;
  kelas: string;
  sesi?: string | null;
  kegiatanNama?: string | null;
  status: "HADIR" | "IZIN" | "SAKIT" | "ALPHA";
  keterangan: string;
  tanggal: string; // YYYY-MM-DD
  usbu: string;
};

const STATUS_CONFIG = [
  { key: "HADIR", label: "Hadir", color: "#10b981", light: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { key: "IZIN", label: "Izin", color: "#6366f1", light: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { key: "SAKIT", label: "Sakit", color: "#f59e0b", light: "bg-amber-50 text-amber-700 border-amber-200" },
  { key: "ALPHA", label: "Alpha", color: "#f43f5e", light: "bg-rose-50 text-rose-700 border-rose-200" },
];

export function AbsensiRekapDetailClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const type = searchParams.get("type");
  const kategoriId = searchParams.get("kategoriId");
  const dari = searchParams.get("dari");
  const sampai = searchParams.get("sampai");
  const title = searchParams.get("title") || "Rincian Absen";

  const [data, setData] = useState<SantriDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!type || !dari || !sampai) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ type, dari, sampai });
        if (kategoriId) params.append("kategoriId", kategoriId);

        const res = await fetch(`/api/admin/absensi/rekap/detail?${params}`);
        const result = await res.json();
        if (Array.isArray(result)) {
          setData(result);
        } else {
          setData([]);
        }
      } catch (e) {
        console.error("Gagal memuat detail absensi", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [type, kategoriId, dari, sampai]);

  // Aggregate stats
  const stats = useMemo(() => {
    const counts = { HADIR: 0, IZIN: 0, SAKIT: 0, ALPHA: 0 };
    data.forEach((r) => {
      if (r.status in counts) counts[r.status as keyof typeof counts]++;
    });

    const total = counts.HADIR + counts.IZIN + counts.SAKIT + counts.ALPHA;

    const barData = [
      { name: "Hadir", total: counts.HADIR },
      { name: "Izin", total: counts.IZIN },
      { name: "Sakit", total: counts.SAKIT },
      { name: "Alpha", total: counts.ALPHA },
    ];

    const pieData = STATUS_CONFIG.map((c) => ({
      name: c.label,
      value: counts[c.key as keyof typeof counts],
      color: c.color,
    })).filter((c) => c.value > 0);

    return { counts, total, barData, pieData };
  }, [data]);

  // Group by Kelas/Sakan
  const groupedData = useMemo(() => {
    const filteredData = data.filter(d =>
      d.namaSantri.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.kelas.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const groups: Record<string, typeof filteredData> = {};
    filteredData.forEach(d => {
      const g = type === "kelas" ? d.kelas : d.sakan;
      const key = g || "Tidak Diketahui";
      if (!groups[key]) groups[key] = [];
      groups[key].push(d);
    });

    // Sort groups alphabetically
    const keys = Object.keys(groups).sort();
    return keys.map(k => ({
      groupName: k,
      records: groups[k]
    }));
  }, [data, searchQuery, type]);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    groupedData.forEach(g => {
      next[g.groupName] = true;
    });
    setExpandedGroups(next);
  }

  const collapseAll = () => setExpandedGroups({});

  if (!type || !dari || !sampai) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200">
        <p className="font-bold text-slate-800">Parameter tidak lengkap</p>
        <button onClick={() => router.back()} className="mt-4 text-violet-600 font-bold">Kembali</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Navigation */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <p className="text-xs font-semibold text-slate-500">
            {dari} <span className="mx-1 font-normal text-slate-300">s/d</span> {sampai}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600"></div>
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-center bg-white rounded-3xl border border-slate-200 border-dashed">
          <FileText className="h-10 w-10 text-slate-300 mb-4" />
          <p className="text-base font-bold text-slate-700">Tidak ada data kehadiran</p>
          <p className="text-sm text-slate-500 mt-2">Belum ada absen pada periode yang dipilih.</p>
        </div>
      ) : (
        <>
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart Card */}
            <div className="p-6 bg-white rounded-[2rem] border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-6">Distribusi Kehadiran</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.barData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Tooltip
                      cursor={{ fill: '#f1f5f9' }}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={50}>
                      {stats.barData.map((entry, index) => {
                        const color = STATUS_CONFIG.find(c => c.label === entry.name)?.color || "#cbd5e1";
                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie Chart Card & Summary */}
            <div className="p-6 bg-white rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-6 lg:gap-8">
              <div className="flex-1 w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {stats.pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [`${value} Catatan`, name]}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600, color: '#475569' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="shrink-0 w-full md:w-48 space-y-3">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                  <p className="text-3xl font-black text-slate-800">{stats.total}</p>
                  <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">Total Data</p>
                </div>
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                  <p className="text-2xl font-black text-emerald-700">
                    {stats.total > 0 ? Math.round((stats.counts.HADIR / stats.total) * 100) : 0}%
                  </p>
                  <p className="text-xs font-semibold text-emerald-600 mt-1 uppercase tracking-wider">Persentase Hadir</p>
                </div>
              </div>
            </div>
          </div>

          {/* Grouped Data Wrapper */}
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Data Terperinci</h3>
                <p className="text-xs text-slate-500 font-medium">
                  {type === "kelas" ? "Berdasarkan Kelas" : "Berdasarkan Sakan / Lokasi"}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari santri..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all font-semibold"
                  />
                </div>

                {/* Expand / Collapse Controls */}
                <div className="hidden sm:flex bg-slate-100 p-1 rounded-xl">
                  <button onClick={expandAll} className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-white hover:shadow-sm rounded-lg transition">Buka Semua</button>
                  <button onClick={collapseAll} className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-white hover:shadow-sm rounded-lg transition">Tutup</button>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 bg-slate-50/50 space-y-4">
              {groupedData.length === 0 ? (
                <p className="text-center font-semibold text-slate-400 py-10">Pencarian tidak ditemukan</p>
              ) : (
                groupedData.map((group) => {
                  const isExpanded = !!expandedGroups[group.groupName];

                  // Compute stats per group
                  const gCounts = { HADIR: 0, IZIN: 0, SAKIT: 0, ALPHA: 0 };
                  group.records.forEach(r => {
                    const k = r.status as keyof typeof gCounts;
                    if (k in gCounts) gCounts[k]++;
                  });
                  const gTotal = group.records.length;
                  const gHadirPct = gTotal > 0 ? Math.round((gCounts.HADIR / gTotal) * 100) : 0;

                  return (
                    <div key={group.groupName} className="bg-white border border-slate-200 rounded-2xl overflow-hidden transition-all shadow-sm">
                      {/* Accordion Header */}
                      <button
                        onClick={() => toggleGroup(group.groupName)}
                        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition text-left"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700 transition-transform ${isExpanded ? "rotate-90" : ""}`}>
                            <ChevronRight className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 text-base">{group.groupName}</h4>
                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 font-semibold">
                              <span>{gTotal} Siswa</span>
                              <span className="w-1 h-1 rounded-full bg-slate-300" />
                              <span className="text-emerald-600">{gHadirPct}% Hadir</span>
                            </div>
                          </div>
                        </div>

                        {/* Visual bar kecil di sebelah kanan header */}
                        <div className="hidden md:flex gap-1">
                          {STATUS_CONFIG.map(c => {
                            const v = gCounts[c.key as keyof typeof gCounts];
                            if (v === 0) return null;
                            return (
                              <span key={c.key} className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${c.light}`}>
                                {v} {c.label}
                              </span>
                            )
                          })}
                        </div>
                      </button>

                      {/* Accordion Body */}
                      {isExpanded && (
                        <div className="border-t border-slate-100 bg-slate-50/50 p-4 flow-root overflow-hidden">
                          {type === "kelas" ? (
                            // MATRIX RENDERER
                            (() => {
                              const datesInClass = Array.from(new Set(group.records.map(r => r.tanggal))).sort();
                              const santris = Array.from(new Set(group.records.map(r => r.namaSantri))).sort();
                              const sessionKeys = ["SESI_1", "SESI_2", "SESI_3", "SESI_4", "SESI_5", "SESI_6"];

                              // Group dates by Usbu
                              const weeksMap = new Map<string, string[]>();
                              datesInClass.forEach(date => {
                                const sampleRecord = group.records.find(r => r.tanggal === date);
                                const wk = sampleRecord ? sampleRecord.usbu : "Usbu'";
                                if (!weeksMap.has(wk)) weeksMap.set(wk, []);
                                weeksMap.get(wk)!.push(date);
                              });
                              const weeks = Array.from(weeksMap.entries()).map(([wk, dts]) => ({ wk, dates: dts }));

                              const recordMap = new Map();
                              group.records.forEach(r => recordMap.set(`${r.namaSantri}_${r.tanggal}_${r.sesi}`, r));

                              return (
                                <div className="overflow-x-auto w-full rounded-xl border border-slate-200 bg-white shadow-sm relative">
                                  <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
                                    <thead className="bg-slate-50">
                                      <tr>
                                        <th rowSpan={2} className="px-4 py-3 border-b border-r-2 border-slate-300 font-bold text-slate-700 sticky left-0 bg-slate-50 z-20 min-w-[200px]">NAMA SANTRI</th>
                                        {weeks.map((week, wIdx) => (
                                          <React.Fragment key={`wh1-${week.wk}`}>
                                            {week.dates.map(date => (
                                              <th key={`dh1-${date}`} colSpan={7} className="px-4 py-2 text-center border-b border-r-2 border-slate-300 font-bold text-slate-700">
                                                {format(new Date(date), "EEEE, d MMM yyyy", { locale: id })}
                                              </th>
                                            ))}
                                            <th key={`wh1-sum-${week.wk}`} colSpan={4} className="px-4 py-2 text-center border-b border-r-4 border-slate-400 font-bold text-slate-800 bg-slate-100">
                                              {week.wk}
                                            </th>
                                          </React.Fragment>
                                        ))}
                                        <th colSpan={4} className="px-4 py-2 text-center border-b border-l-4 border-slate-400 font-black text-slate-900 bg-emerald-50">
                                          TOTAL
                                        </th>
                                      </tr>
                                      <tr>
                                        {weeks.map((week) => (
                                          <React.Fragment key={`wh2-${week.wk}`}>
                                            {week.dates.map(date => (
                                              <React.Fragment key={`dh2-${date}`}>
                                                {sessionKeys.map((s, i) => (
                                                  <th key={`${date}-${s}`} className="px-2 py-2 text-center border-b border-r border-slate-200 text-xs font-semibold text-slate-500 min-w-[32px]">
                                                    {i + 1}
                                                  </th>
                                                ))}
                                                <th className="px-2 py-2 text-center border-b border-r-2 border-slate-300 text-[10px] font-bold text-slate-600 bg-slate-50/50 min-w-[40px]">
                                                  JML
                                                </th>
                                              </React.Fragment>
                                            ))}
                                            <th className="px-2 py-2 text-center text-xs font-bold text-emerald-600 bg-slate-100 border-b border-r border-slate-300">H</th>
                                            <th className="px-2 py-2 text-center text-xs font-bold text-indigo-600 bg-slate-100 border-b border-r border-slate-300">I</th>
                                            <th className="px-2 py-2 text-center text-xs font-bold text-amber-600 bg-slate-100 border-b border-r border-slate-300">S</th>
                                            <th className="px-2 py-2 text-center text-xs font-bold text-rose-600 bg-slate-100 border-b border-r-4 border-slate-400">A</th>
                                          </React.Fragment>
                                        ))}
                                        <th className="px-2 py-2 text-center text-xs font-black text-emerald-700 bg-emerald-50 border-b border-r border-slate-300">H</th>
                                        <th className="px-2 py-2 text-center text-xs font-black text-indigo-700 bg-emerald-50 border-b border-r border-slate-300">I</th>
                                        <th className="px-2 py-2 text-center text-xs font-black text-amber-700 bg-emerald-50 border-b border-r border-slate-300">S</th>
                                        <th className="px-2 py-2 text-center text-xs font-black text-rose-700 bg-emerald-50 border-b">A</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {santris.map((santri, idx) => {
                                        let totalH = 0, totalI = 0, totalS = 0, totalA = 0;
                                        return (
                                          <tr key={santri} className="hover:bg-slate-50/50 group">
                                            <td className="px-4 py-2 text-sm font-semibold text-slate-800 border-b border-r-2 border-slate-300 sticky left-0 bg-white group-hover:bg-slate-50 z-10">
                                              <span className="text-slate-400 mr-2 text-xs w-4 inline-block">{idx + 1}</span>
                                              {santri}
                                            </td>
                                            {weeks.map((week) => {
                                              let weekH = 0, weekI = 0, weekS = 0, weekA = 0;
                                              return (
                                                <React.Fragment key={`row-${santri}-w-${week.wk}`}>
                                                  {week.dates.map(date => {
                                                    let dayH = 0, dayI = 0, dayS = 0, dayA = 0;
                                                    return (
                                                      <React.Fragment key={`row-${santri}-d-${date}`}>
                                                        {sessionKeys.map((sesi) => {
                                                          const rec = recordMap.get(`${santri}_${date}_${sesi}`);
                                                          let cellContent = <span className="text-slate-200">-</span>;
                                                          if (rec) {
                                                            if (rec.status === "HADIR") { cellContent = <span className="font-bold text-emerald-500">✓</span>; dayH++; weekH++; totalH++; }
                                                            else if (rec.status === "IZIN") { cellContent = <span className="font-bold text-indigo-500">I</span>; dayI++; weekI++; totalI++; }
                                                            else if (rec.status === "SAKIT") { cellContent = <span className="font-bold text-amber-500">S</span>; dayS++; weekS++; totalS++; }
                                                            else if (rec.status === "ALPHA") { cellContent = <span className="font-bold text-rose-500">X</span>; dayA++; weekA++; totalA++; }
                                                          }
                                                          return (
                                                            <td key={`${santri}-${date}-${sesi}`} className="px-2 py-2 text-center border-b border-r border-slate-200">
                                                              {cellContent}
                                                            </td>
                                                          );
                                                        })}
                                                        <td className="px-1 py-1 text-center border-b border-r-2 border-slate-300 bg-slate-50/50 align-top content-center">
                                                          <div className="flex flex-col gap-[2px] text-[10px] items-center min-w-[28px]">
                                                            {dayH > 0 && <span className="text-emerald-700 font-bold bg-emerald-100/50 w-full rounded">H:{dayH}</span>}
                                                            {dayI > 0 && <span className="text-indigo-700 font-bold bg-indigo-100/50 w-full rounded">I:{dayI}</span>}
                                                            {dayS > 0 && <span className="text-amber-700 font-bold bg-amber-100/50 w-full rounded">S:{dayS}</span>}
                                                            {dayA > 0 && <span className="text-rose-700 font-bold bg-rose-100/50 w-full rounded">A:{dayA}</span>}
                                                            {dayH === 0 && dayI === 0 && dayS === 0 && dayA === 0 && <span className="text-slate-300">-</span>}
                                                          </div>
                                                        </td>
                                                      </React.Fragment>
                                                    );
                                                  })}
                                                  <td className="px-2 py-2 text-center text-xs font-bold text-emerald-700 bg-slate-100 border-b border-r border-slate-300">{weekH}</td>
                                                  <td className="px-2 py-2 text-center text-xs font-bold text-indigo-700 bg-slate-100 border-b border-r border-slate-300">{weekI}</td>
                                                  <td className="px-2 py-2 text-center text-xs font-bold text-amber-700 bg-slate-100 border-b border-r border-slate-300">{weekS}</td>
                                                  <td className="px-2 py-2 text-center text-xs font-bold text-rose-700 bg-slate-100 border-b border-r-4 border-slate-400">{weekA}</td>
                                                </React.Fragment>
                                              );
                                            })}
                                            <td className="px-2 py-2 text-center text-sm font-black text-emerald-800 bg-emerald-50 border-b border-r border-slate-300">{totalH}</td>
                                            <td className="px-2 py-2 text-center text-sm font-black text-indigo-800 bg-emerald-50 border-b border-r border-slate-300">{totalI}</td>
                                            <td className="px-2 py-2 text-center text-sm font-black text-amber-800 bg-emerald-50 border-b border-r border-slate-300">{totalS}</td>
                                            <td className="px-2 py-2 text-center text-sm font-black text-rose-800 bg-emerald-50 border-b">{totalA}</td>
                                          </tr>
                                        );
                                      })}
                                      {santris.length === 0 && (
                                        <tr>
                                          <td className="px-4 py-8 text-center text-slate-500" colSpan={100}>Tidak ada data yang tersedia</td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              );
                            })()
                          ) : type === "sakan" ? (
                            // MATRIX RENDERER FOR SAKAN
                            (() => {
                              const datesInGroup = Array.from(new Set(group.records.map(r => r.tanggal))).sort();
                              const santris = Array.from(new Set(group.records.map(r => r.namaSantri))).sort();

                              // Group dates by Usbu
                              const weeksMap = new Map<string, string[]>();
                              datesInGroup.forEach(date => {
                                const sampleRecord = group.records.find(r => r.tanggal === date);
                                const wk = sampleRecord ? sampleRecord.usbu : "Usbu'";
                                if (!weeksMap.has(wk)) weeksMap.set(wk, []);
                                weeksMap.get(wk)!.push(date);
                              });
                              const weeks = Array.from(weeksMap.entries()).map(([wk, dts]) => ({ wk, dates: dts }));

                              const recordMap = new Map();
                              group.records.forEach(r => recordMap.set(`${r.namaSantri}_${r.tanggal}`, r));

                              return (
                                <div className="overflow-x-auto w-full rounded-xl border border-slate-200 bg-white shadow-sm relative">
                                  <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
                                    <thead className="bg-slate-50">
                                      <tr>
                                        <th rowSpan={2} className="px-4 py-3 border-b border-r-2 border-slate-300 font-bold text-slate-700 sticky left-0 bg-slate-50 z-20 min-w-[200px] uppercase text-xs tracking-wider">NAMA SANTRI</th>
                                        {weeks.map((week, wIdx) => (
                                          <React.Fragment key={`wh1-${week.wk}`}>
                                            {week.dates.map(date => (
                                              <th key={`dh1-${date}`} rowSpan={2} className="px-1.5 py-2 text-center border-b border-r border-slate-200 font-semibold text-slate-600 min-w-[36px] text-xs">
                                                <div className="flex flex-col items-center">
                                                  <span className="text-[10px] text-slate-400">{format(new Date(date), "E", { locale: id })}</span>
                                                  <span>{format(new Date(date), "d", { locale: id })}</span>
                                                </div>
                                              </th>
                                            ))}
                                            <th key={`wh1-sum-${week.wk}`} colSpan={4} className="px-2 py-2 text-center border-b border-l-2 border-r-2 border-slate-300 font-bold text-slate-800 bg-slate-100/50 text-xs">
                                              {week.wk}
                                            </th>
                                          </React.Fragment>
                                        ))}
                                        <th colSpan={4} className="px-3 py-2 text-center border-b border-l-4 border-slate-400 font-black text-slate-900 bg-emerald-50 text-xs">
                                          TOTAL
                                        </th>
                                      </tr>
                                      <tr>
                                        {weeks.map((week) => (
                                          <React.Fragment key={`wh2-${week.wk}`}>
                                            <th className="px-1.5 py-1.5 text-center text-[10px] font-bold text-emerald-600 bg-slate-50 border-b border-r border-l-2 border-slate-300">H</th>
                                            <th className="px-1.5 py-1.5 text-center text-[10px] font-bold text-indigo-600 bg-slate-50 border-b border-r border-slate-300">I</th>
                                            <th className="px-1.5 py-1.5 text-center text-[10px] font-bold text-amber-600 bg-slate-50 border-b border-r border-slate-300">S</th>
                                            <th className="px-1.5 py-1.5 text-center text-[10px] font-bold text-rose-600 bg-slate-50 border-b border-r-2 border-slate-300">A</th>
                                          </React.Fragment>
                                        ))}
                                        <th className="px-2 py-1.5 text-center text-xs font-black text-emerald-700 bg-emerald-50 border-b border-r border-slate-300">H</th>
                                        <th className="px-2 py-1.5 text-center text-xs font-black text-indigo-700 bg-emerald-50 border-b border-r border-slate-300">I</th>
                                        <th className="px-2 py-1.5 text-center text-xs font-black text-amber-700 bg-emerald-50 border-b border-r border-slate-300">S</th>
                                        <th className="px-2 py-1.5 text-center text-xs font-black text-rose-700 bg-emerald-50 border-b">A</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {santris.map((santri, idx) => {
                                        let totalH = 0, totalI = 0, totalS = 0, totalA = 0;
                                        return (
                                          <tr key={santri} className="hover:bg-slate-50/50 group">
                                            <td className="px-4 py-2 text-[13px] font-semibold text-slate-800 border-b border-r-2 border-slate-300 sticky left-0 bg-white group-hover:bg-slate-50 z-10 transition-colors">
                                              <span className="text-slate-400 mr-2 text-[11px] w-4 inline-block">{idx + 1}</span>
                                              {santri}
                                            </td>
                                            {weeks.map((week) => {
                                              let weekH = 0, weekI = 0, weekS = 0, weekA = 0;
                                              return (
                                                <React.Fragment key={`row-${santri}-w-${week.wk}`}>
                                                  {week.dates.map(date => {
                                                    const rec = recordMap.get(`${santri}_${date}`);
                                                    let cellContent = <span className="text-slate-200 text-xs font-medium">L</span>;
                                                    if (rec) {
                                                      if (rec.status === "HADIR") { cellContent = <span className="font-bold text-emerald-500 text-base">✓</span>; weekH++; totalH++; }
                                                      else if (rec.status === "IZIN") { cellContent = <span className="font-bold text-indigo-500 text-sm">I</span>; weekI++; totalI++; }
                                                      else if (rec.status === "SAKIT") { cellContent = <span className="font-bold text-amber-500 text-sm">S</span>; weekS++; totalS++; }
                                                      else if (rec.status === "ALPHA") { cellContent = <span className="font-bold text-rose-500 text-sm">X</span>; weekA++; totalA++; }
                                                    }
                                                    return (
                                                      <td key={`${santri}-${date}`} className="p-0 border-b border-r border-slate-100 align-middle">
                                                        <div className="flex items-center justify-center w-full h-full min-h-[32px] hover:bg-slate-50">
                                                          {cellContent}
                                                        </div>
                                                      </td>
                                                    );
                                                  })}
                                                  <td className="px-1.5 py-2 text-center text-xs font-bold text-emerald-700 bg-slate-50 border-b border-r border-l-2 border-slate-300">{weekH}</td>
                                                  <td className="px-1.5 py-2 text-center text-xs font-bold text-indigo-700 bg-slate-50 border-b border-r border-slate-300">{weekI}</td>
                                                  <td className="px-1.5 py-2 text-center text-xs font-bold text-amber-700 bg-slate-50 border-b border-r border-slate-300">{weekS}</td>
                                                  <td className="px-1.5 py-2 text-center text-xs font-bold text-rose-700 bg-slate-50 border-b border-r-2 border-slate-300">{weekA}</td>
                                                </React.Fragment>
                                              );
                                            })}
                                            <td className="px-2 py-2 text-center text-sm font-black text-emerald-800 bg-emerald-50 border-b border-r border-slate-300">{totalH}</td>
                                            <td className="px-2 py-2 text-center text-sm font-black text-indigo-800 bg-emerald-50 border-b border-r border-slate-300">{totalI}</td>
                                            <td className="px-2 py-2 text-center text-sm font-black text-amber-800 bg-emerald-50 border-b border-r border-slate-300">{totalS}</td>
                                            <td className="px-2 py-2 text-center text-sm font-black text-rose-800 bg-emerald-50 border-b">{totalA}</td>
                                          </tr>
                                        );
                                      })}
                                      {santris.length === 0 && (
                                        <tr>
                                          <td className="px-4 py-8 text-center text-slate-500" colSpan={100}>Tidak ada data yang tersedia</td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              );
                            })()
                          ) : (
                            // MATRIX RENDERER FOR KEGIATAN GLOBAL
                            (() => {
                              const uniqueEvents = Array.from(new Set(group.records.map(r => `${r.tanggal}|${r.kegiatanNama}`)))
                                .map(str => {
                                  const [tgl, keg] = str.split("|");
                                  return { tanggal: tgl, kegName: keg };
                                })
                                .sort((a, b) => a.tanggal.localeCompare(b.tanggal));

                              const santris = Array.from(new Set(group.records.map(r => r.namaSantri))).sort();
                              const recordMap = new Map();
                              group.records.forEach(r => recordMap.set(`${r.namaSantri}_${r.kegiatanNama}_${r.tanggal}`, r));

                              return (
                                <div className="overflow-x-auto w-full rounded-xl border border-slate-200 bg-white shadow-sm relative">
                                  <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
                                    <thead className="bg-slate-50">
                                      <tr>
                                        <th rowSpan={2} className="px-4 py-3 border-b border-r-2 border-slate-300 font-bold text-slate-700 sticky left-0 bg-slate-50 z-20 min-w-[200px] uppercase text-xs tracking-wider">NAMA SANTRI</th>
                                        {uniqueEvents.map((ev, i) => (
                                          <th key={`keg-${i}`} className="px-1 py-2 text-center border-b border-x border-slate-300 font-bold text-slate-800 bg-amber-50/50 text-[10px] leading-tight whitespace-normal break-words max-w-[80px]" title={ev.kegName || ""}>
                                            {ev.kegName || "-"}
                                          </th>
                                        ))}
                                        <th colSpan={4} className="px-3 py-2 text-center border-b border-l-4 border-slate-400 font-black text-slate-900 bg-emerald-50 text-xs">
                                          TOTAL
                                        </th>
                                      </tr>
                                      <tr>
                                        {uniqueEvents.map((ev, i) => (
                                          <th key={`date-${i}`} className="px-1.5 py-1.5 text-center border-b border-slate-200 border-x font-bold text-slate-600 min-w-[36px] text-xs">
                                            <div className="flex flex-col items-center">
                                              <span className="text-[10px] text-slate-400">{format(new Date(ev.tanggal), "E", { locale: id })}</span>
                                              <span>{format(new Date(ev.tanggal), "d", { locale: id })}</span>
                                            </div>
                                          </th>
                                        ))}
                                        <th className="px-2 py-1.5 text-center text-xs font-black text-emerald-700 bg-emerald-50 border-b border-r border-slate-300">H</th>
                                        <th className="px-2 py-1.5 text-center text-xs font-black text-indigo-700 bg-emerald-50 border-b border-r border-slate-300">I</th>
                                        <th className="px-2 py-1.5 text-center text-xs font-black text-amber-700 bg-emerald-50 border-b border-r border-slate-300">S</th>
                                        <th className="px-2 py-1.5 text-center text-xs font-black text-rose-700 bg-emerald-50 border-b">A</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {santris.map((santri, idx) => {
                                        let totalH = 0, totalI = 0, totalS = 0, totalA = 0;
                                        return (
                                          <tr key={santri} className="hover:bg-slate-50/50 group">
                                            <td className="px-4 py-2 text-[13px] font-semibold text-slate-800 border-b border-r-2 border-slate-300 sticky left-0 bg-white group-hover:bg-slate-50 z-10 transition-colors">
                                              <span className="text-slate-400 mr-2 text-[11px] w-4 inline-block">{idx + 1}</span>
                                              {santri}
                                            </td>
                                            {uniqueEvents.map((ev, i) => {
                                              const rec = recordMap.get(`${santri}_${ev.kegName}_${ev.tanggal}`);
                                              let cellContent = <span className="text-slate-200 text-xs font-medium">-</span>;
                                              if (rec) {
                                                if (rec.status === "HADIR") { cellContent = <span className="font-bold text-emerald-500 text-base">✓</span>; totalH++; }
                                                else if (rec.status === "IZIN") { cellContent = <span className="font-bold text-indigo-500 text-sm">I</span>; totalI++; }
                                                else if (rec.status === "SAKIT") { cellContent = <span className="font-bold text-amber-500 text-sm">S</span>; totalS++; }
                                                else if (rec.status === "ALPHA") { cellContent = <span className="font-bold text-rose-500 text-sm">X</span>; totalA++; }
                                              }
                                              return (
                                                <td key={`cell-${i}`} className="p-0 border-b border-x border-slate-100 align-middle">
                                                  <div className="flex items-center justify-center w-full h-full min-h-[32px] hover:bg-slate-50">
                                                    {cellContent}
                                                  </div>
                                                </td>
                                              );
                                            })}
                                            <td className="px-2 py-2 text-center text-sm font-black text-emerald-800 bg-emerald-50 border-b border-r border-slate-300 border-l-2">{totalH}</td>
                                            <td className="px-2 py-2 text-center text-sm font-black text-indigo-800 bg-emerald-50 border-b border-r border-slate-300">{totalI}</td>
                                            <td className="px-2 py-2 text-center text-sm font-black text-amber-800 bg-emerald-50 border-b border-r border-slate-300">{totalS}</td>
                                            <td className="px-2 py-2 text-center text-sm font-black text-rose-800 bg-emerald-50 border-b">{totalA}</td>
                                          </tr>
                                        );
                                      })}
                                      {santris.length === 0 && (
                                        <tr>
                                          <td className="px-4 py-8 text-center text-slate-500" colSpan={100}>Tidak ada data yang tersedia</td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              );
                            })()
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
