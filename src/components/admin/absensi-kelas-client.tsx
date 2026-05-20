"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Clock, Lock, CheckCircle2 } from "lucide-react";

type SantriAbsenTarget = {
  riwayatId: string;
  santriId: string;
  nama: string;
  sakan: string;
  kamar: string;
  gender: string;
  kategori: string;
  kelasId: string | null;
  kelasNama: string | null;
  programId: string | null;
  programNama: string | null;
};

type AbsenStatus = "HADIR" | "IZIN" | "SAKIT" | "ALPHA";
type SesiKelas = "SESI_1" | "SESI_2" | "SESI_3" | "SESI_4" | "SESI_5" | "SESI_6";

export function AbsensiKelasClient({ 
  programList, 
  allowedClassIds = null, 
  userRole,
  teacherSessions = []
}: { 
  programList: any[]; 
  allowedClassIds?: string[] | null; 
  userRole?: string;
  teacherSessions?: { sesi: string; kelasId: string }[];
}) {
  const [tanggal, setTanggal] = useState("");
  const [sesi, setSesi] = useState<SesiKelas>("SESI_1");
  const [kelasId, setKelasId] = useState(
    allowedClassIds && allowedClassIds.length > 0 ? allowedClassIds[0] : "ALL"
  );
  const [santriList, setSantriList] = useState<SantriAbsenTarget[]>([]);
  const [absenMap, setAbsenMap] = useState<Record<string, { status: AbsenStatus; keterangan: string }>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const isTeacher = userRole === "PENGAJAR" || userRole === "WALI_KELAS";
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [hasCheckedSession, setHasCheckedSession] = useState(false);
  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [jadwalSesiList, setJadwalSesiList] = useState<any[]>([]);

  // State untuk Absen Pengajar
  const [materi, setMateri] = useState("");
  const [waktuMulai, setWaktuMulai] = useState("");
  const [waktuSelesai, setWaktuSelesai] = useState("");
  const [atribut, setAtribut] = useState({ kopiah: false, nametag: false, bros: false });

  useEffect(() => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const parts = formatter.formatToParts(new Date());
    const y = parts.find(p => p.type === 'year')?.value;
    const m = parts.find(p => p.type === 'month')?.value;
    const d = parts.find(p => p.type === 'day')?.value;
    setTanggal(`${y}-${m}-${d}`);

    // Fetch jadwal sesi to determine active session
    fetch("/api/admin/jadwal-sesi")
      .then(res => res.json())
      .then(data => {
        setJadwalSesiList(data);
        const curHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
        const curMin = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
        
        let currentActive: string | null = null;
        for (const jadwal of data) {
           if (!jadwal.isActive) continue;
           const [bukaH, bukaM] = jadwal.jamBuka.split(':').map(Number);
           const [tutupH, tutupM] = jadwal.jamTutup.split(':').map(Number);
           
           const bukaVal = bukaH * 60 + bukaM;
           const tutupVal = tutupH * 60 + tutupM + jadwal.toleransiMenit;
           const curVal = curHour * 60 + curMin;
           
           let isActive = false;
           if (bukaVal <= tutupVal) {
             // Normal case (e.g. 05:30 to 15:00)
             isActive = curVal >= bukaVal && curVal <= tutupVal;
           } else {
             // Cross-midnight case (e.g. 22:00 to 02:00)
             isActive = curVal >= bukaVal || curVal <= tutupVal;
           }
           
           if (isActive) {
             currentActive = jadwal.sesi;
             break;
           }
        }
        
        if (isTeacher) {
          if (currentActive) {
            // Find class for this session
            const teachingThisSession = teacherSessions.find(ts => ts.sesi === currentActive);
            
            if (teachingThisSession) {
              setSesi(currentActive as SesiKelas);
              setKelasId(teachingThisSession.kelasId);
              setActiveClassId(teachingThisSession.kelasId);
            } else {
              // Active session exists, but teacher doesn't teach now
              currentActive = null; 
              setSesi("" as SesiKelas);
            }
          } else {
            setSesi("" as SesiKelas); 
          }
        }
        setActiveSession(currentActive);
        setHasCheckedSession(true);
      })
      .catch(() => setHasCheckedSession(true));
  }, [isTeacher, teacherSessions]);

  // Efek interval untuk auto-switch sesi
  useEffect(() => {
    if (!isTeacher || jadwalSesiList.length === 0) return;

    const intervalId = setInterval(() => {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      const parts = formatter.formatToParts(new Date());
      const curHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
      const curMin = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
      
      let currentActive: string | null = null;
      for (const jadwal of jadwalSesiList) {
         if (!jadwal.isActive) continue;
         const [bukaH, bukaM] = jadwal.jamBuka.split(':').map(Number);
         const [tutupH, tutupM] = jadwal.jamTutup.split(':').map(Number);
         
         const bukaVal = bukaH * 60 + bukaM;
         const tutupVal = tutupH * 60 + tutupM + jadwal.toleransiMenit;
         const curVal = curHour * 60 + curMin;
         
         let isActive = false;
         if (bukaVal <= tutupVal) {
           isActive = curVal >= bukaVal && curVal <= tutupVal;
         } else {
           isActive = curVal >= bukaVal || curVal <= tutupVal;
         }
         
         if (isActive) {
           currentActive = jadwal.sesi;
           break;
         }
      }

      if (activeSession !== currentActive) {
         setActiveSession(currentActive);
         // Pergantian sesi terdeteksi!
         if (currentActive) {
           if (isTeacher) {
             const teachingThisSession = teacherSessions.find(ts => ts.sesi === currentActive);
             if (teachingThisSession) {
               setSesi(currentActive as SesiKelas);
               setKelasId(teachingThisSession.kelasId);
               setActiveClassId(teachingThisSession.kelasId);
               toast("Sesi berganti otomatis ke " + currentActive.replace('_', ' '), { icon: '🔄' });
             } else {
               setSesi("" as SesiKelas);
               toast("Sesi berganti, Anda tidak ada jadwal", { icon: '🔄' });
             }
           } else {
             setSesi(currentActive as SesiKelas);
             toast("Sesi aktif berganti otomatis ke " + currentActive.replace('_', ' '), { icon: '🔄' });
           }
         } else {
           setSesi("" as SesiKelas);
           toast("Sesi saat ini telah berakhir", { icon: '🔒' });
         }
      }
    }, 10000); // Check setiap 10 detik

    return () => clearInterval(intervalId);
  }, [isTeacher, jadwalSesiList, teacherSessions, activeSession]);

  useEffect(() => {
    if (!tanggal || !sesi) return;
    if (isTeacher && !hasCheckedSession) return;
    
    let ignore = false;
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/admin/absensi/kelas?tanggal=${tanggal}&sesi=${sesi}&kelasId=${kelasId}`);
        const data = await res.json();
        
        if (ignore) return;
        
        if (data.santriList) {
          setSantriList(data.santriList);
        } else {
          setSantriList([]);
        }
        
        if (data.absenPengajarData) {
          setMateri(data.absenPengajarData.materi || "");
          setWaktuMulai(data.absenPengajarData.waktuMulai || "");
          setWaktuSelesai(data.absenPengajarData.waktuSelesai || "");
          setAtribut({
            kopiah: !!data.absenPengajarData.atributKopiah,
            nametag: !!data.absenPengajarData.atributNametag,
            bros: !!data.absenPengajarData.atributBros,
          });
        } else {
          setMateri("");
          setWaktuMulai("");
          setWaktuSelesai("");
          setAtribut({ kopiah: false, nametag: false, bros: false });
        }
        
        const newMap: Record<string, any> = {};
        if (data.absenData) {
          data.absenData.forEach((a: any) => {
            newMap[a.riwayatId] = { status: a.status, keterangan: a.keterangan || "" };
          });
        }
        setAbsenMap(newMap);
      } catch (error) {
        if (!ignore) toast.error("Gagal memuat data absensi kelas");
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };

    fetchData();
    return () => {
      ignore = true;
    };
  }, [tanggal, sesi, kelasId, isTeacher, hasCheckedSession]);

  const handleStatusChange = (riwayatId: string, status: AbsenStatus) => {
    setAbsenMap(prev => ({
      ...prev,
      [riwayatId]: { ...prev[riwayatId], status, keterangan: prev[riwayatId]?.keterangan || "" }
    }));
  };

  const handleKeteranganChange = (riwayatId: string, keterangan: string) => {
    setAbsenMap(prev => ({
      ...prev,
      [riwayatId]: { ...prev[riwayatId], status: prev[riwayatId]?.status || "ALPHA", keterangan }
    }));
  };

  const setAllStatus = (status: AbsenStatus) => {
    const newMap = { ...absenMap };
    santriList.forEach(s => {
      newMap[s.riwayatId] = { status, keterangan: newMap[s.riwayatId]?.keterangan || "" };
    });
    setAbsenMap(newMap);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const absenList = Object.entries(absenMap).map(([riwayatId, data]) => ({
        riwayatId,
        status: data.status,
        keterangan: data.keterangan,
      }));

      const payload: any = { tanggal, sesi, kelasId, absenList };
      if (isTeacher) {
        if (!materi || !waktuMulai || !waktuSelesai) {
          toast.error("Mohon lengkapi Form Absensi Pengajar (Materi dan Waktu)");
          setIsSaving(false);
          return;
        }
        payload.absenPengajar = {
          materi,
          waktuMulai,
          waktuSelesai,
          atributKopiah: atribut.kopiah,
          atributNametag: atribut.nametag,
          atributBros: atribut.bros
        };
      }

      const res = await fetch("/api/admin/absensi/kelas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      const result = await res.json();
      if (result.success) {
        toast.success(`Berhasil menyimpan data absensi kelas`);
      } else {
        toast.error(result.error || "Gagal menyimpan absensi");
      }
    } catch (e) {
      toast.error("Terjadi kesalahan sistem");
    } finally {
      setIsSaving(false);
    }
  };

  const allOptions = (() => {
    const list: { id: string; label: string; group: string }[] = [];
    
    // Jika tidak dibatasi, boleh pilih "Semua Santri"
    if (!allowedClassIds) {
      list.push({ id: "ALL", label: "Semua Santri", group: "" });
    }
    
    programList.forEach((program) => {
      if (program.kelasList.length > 0) {
        program.kelasList.forEach((k: any) => {
          // Jika dibatasi, hanya masukkan kelas yang diperbolehkan
          if (!allowedClassIds || allowedClassIds.includes(k.id)) {
            list.push({ id: k.id, label: k.nama, group: program.nama_indo });
          }
        });
      } else {
        // Program tanpa kelas (jika tidak dibatasi)
        if (!allowedClassIds) {
          list.push({ id: `PROGRAM_${program.id}`, label: program.nama_indo, group: "Program" });
        }
      }
    });
    
    if (!allowedClassIds) {
      list.push({ id: "UNASSIGNED", label: "Belum Ditempatkan", group: "" });
    }
    
    return list;
  })();

  const statHadir = Object.values(absenMap).filter(a => a.status === "HADIR").length;
  const statIzin = Object.values(absenMap).filter(a => a.status === "IZIN").length;
  const statSakit = Object.values(absenMap).filter(a => a.status === "SAKIT").length;
  const statAlpha = Object.values(absenMap).filter(a => a.status === "ALPHA").length;
  const belumDiabsen = santriList.length - Object.keys(absenMap).length;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-6 md:flex-row md:items-end md:justify-between bg-slate-50/50">
          {isTeacher ? (
            <div className="flex flex-col gap-2 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 w-24">Tanggal</span>
                <span className="text-sm font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">{tanggal}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 w-24">Sesi Aktif</span>
                <span className={`text-sm font-bold px-3 py-1 rounded-lg border ${activeSession ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-rose-700 bg-rose-50 border-rose-100'}`}>
                  {activeSession ? activeSession.replace('_', ' ') : "Tidak ada"}
                </span>
              </div>
              {activeClassId && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 w-24">Kelas</span>
                  <span className="text-sm font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
                    {allOptions.find(o => o.id === activeClassId)?.label || activeClassId}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-4 flex-wrap w-full md:w-auto">
              <div className="w-full md:w-auto">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Tanggal
                </label>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500"
                />
              </div>

              <div className="w-full md:w-auto">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Sesi
                </label>
                <select
                  value={sesi}
                  onChange={(e) => setSesi(e.target.value as SesiKelas)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500"
                >
                  <option value="SESI_1">Sesi 1</option>
                  <option value="SESI_2">Sesi 2</option>
                  <option value="SESI_3">Sesi 3</option>
                  <option value="SESI_4">Sesi 4</option>
                  <option value="SESI_5">Sesi 5</option>
                  <option value="SESI_6">Sesi 6</option>
                </select>
              </div>
              
              <div className="w-full md:w-auto">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Filter Kelas
                </label>
                <select
                  value={kelasId}
                  onChange={(e) => setKelasId(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500"
                >
                  {allOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.group ? `${opt.group} — ${opt.label}` : opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setAllStatus("HADIR")}
              className="rounded-full bg-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-300"
            >
              Hadirkan Semua
            </button>
            {!isTeacher && (
              <button
                onClick={handleSave}
                disabled={isSaving || isLoading || !tanggal || !sesi}
                className="rounded-full bg-emerald-600 px-6 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {isSaving ? "Menyimpan..." : "Simpan Absensi"}
              </button>
            )}
          </div>
        </div>

        {isTeacher && hasCheckedSession && !activeSession ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white">
            <div className="h-20 w-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Clock className="h-10 w-10 text-slate-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-700">Tidak ada sesi aktif saat ini</h2>
            <p className="text-slate-500 mt-2 text-center max-w-sm">Jadwal absensi dikunci karena saat ini tidak ada sesi kelas yang sedang berjalan sesuai jadwal buka/tutup.</p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="flex flex-wrap gap-4 border-b border-slate-200 px-6 py-4 bg-white">
               <div className="flex items-center gap-2 text-sm font-bold">
                 <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                 <span className="text-slate-700">Hadir: {statHadir}</span>
               </div>
               <div className="flex items-center gap-2 text-sm font-bold">
                 <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
                 <span className="text-slate-700">Izin: {statIzin}</span>
               </div>
               <div className="flex items-center gap-2 text-sm font-bold">
                 <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                 <span className="text-slate-700">Sakit: {statSakit}</span>
               </div>
               <div className="flex items-center gap-2 text-sm font-bold">
                 <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                 <span className="text-slate-700">Alpha: {statAlpha}</span>
               </div>
               <div className="flex items-center gap-2 text-sm font-bold pl-4 border-l border-slate-200">
                 <span className="text-slate-400">Belum Diabsen: {belumDiabsen}</span>
               </div>
            </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-sm font-semibold text-slate-500">Memuat data santri...</div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                <tr>
                  <th className="px-4 py-4 text-center w-16">#</th>
                  <th className="px-6 py-4">Santri</th>
                  <th className="px-6 py-4 min-w-[300px]">Status Kehadiran</th>
                  <th className="px-6 py-4">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                {santriList.map((santri, index) => {
                  const currentStatus = absenMap[santri.riwayatId]?.status;
                  const currentKet = absenMap[santri.riwayatId]?.keterangan || "";
                  
                  return (
                    <tr key={santri.riwayatId} className="hover:bg-slate-50/50">
                      <td className="px-4 py-4 text-center font-bold text-slate-400">{index + 1}</td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{santri.nama}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                            {santri.kelasNama ?? santri.programNama ?? "Tanpa Kelas"}
                          </span>
                          {santri.gender === "BANIN" ? (
                            <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">BANIN</span>
                          ) : santri.gender === "BANAT" ? (
                            <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">BANAT</span>
                          ) : (
                            <span className="inline-flex items-center rounded-md bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">{santri.gender}</span>
                          )}
                          {santri.kategori === "BARU" ? (
                            <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 capitalize">Baru</span>
                          ) : santri.kategori === "LAMA" ? (
                            <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 capitalize">Lama</span>
                          ) : santri.kategori === "KSU" ? (
                            <span className="inline-flex items-center rounded-md bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700 uppercase">KSU</span>
                          ) : (
                            <span className="inline-flex items-center rounded-md bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700 capitalize">{santri.kategori ?? "-"}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {(["HADIR", "IZIN", "SAKIT", "ALPHA"] as AbsenStatus[]).map((st) => (
                            <button
                              key={st}
                              onClick={() => handleStatusChange(santri.riwayatId, st)}
                              className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                                currentStatus === st
                                  ? st === "HADIR" ? "bg-emerald-500 text-white shadow-emerald-200 shadow-sm"
                                  : st === "IZIN" ? "bg-indigo-500 text-white shadow-indigo-200 shadow-sm"
                                  : st === "SAKIT" ? "bg-amber-500 text-white shadow-amber-200 shadow-sm"
                                  : "bg-rose-500 text-white shadow-rose-200 shadow-sm"
                                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          placeholder="Catatan..."
                          value={currentKet}
                          onChange={(e) => handleKeteranganChange(santri.riwayatId, e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none transition focus:border-emerald-500"
                        />
                      </td>
                    </tr>
                  )
                })}
                {santriList.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500 font-medium">
                      Tidak ada santri yang ditemukan pada filter ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        
        {isTeacher && activeSession && (
          <div className="p-6 md:p-8 bg-slate-50/50 border-t border-slate-200">
            {belumDiabsen > 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center flex flex-col items-center justify-center shadow-sm max-w-2xl mx-auto">
                 <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                   <Lock className="w-8 h-8 text-slate-400" />
                 </div>
                 <h3 className="text-xl font-bold text-slate-700 mb-2">Formulir Pengajar Terkunci</h3>
                 <p className="text-slate-500 text-sm max-w-md leading-relaxed">
                   Anda diwajibkan menyelesaikan absensi seluruh santri di kelas ini terlebih dahulu. Masih ada <strong className="text-rose-500 font-bold">{belumDiabsen} santri</strong> yang statusnya belum ditentukan.
                 </p>
              </div>
            ) : (
              <div className="bg-emerald-50/40 border border-emerald-100 rounded-3xl p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-sm max-w-4xl mx-auto">
                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-100/50 pb-5">
                   <div>
                     <h3 className="text-lg font-bold text-emerald-900 flex items-center gap-2">
                       <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                       Formulir Kehadiran Pengajar
                     </h3>
                     <p className="text-xs font-medium text-emerald-700 mt-1">Lengkapi data mengajar Anda untuk menyelesaikan absensi sesi ini.</p>
                   </div>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-[0.1em] text-slate-600 mb-2">Materi Pelajaran Hari Ini</label>
                      <input type="text" value={materi} onChange={e=>setMateri(e.target.value)} placeholder="Contoh: Nahwu Bab Isim" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-[0.1em] text-slate-600 mb-2">Jam Masuk</label>
                        <input type="time" value={waktuMulai} onChange={e=>setWaktuMulai(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-mono" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-[0.1em] text-slate-600 mb-2">Jam Selesai</label>
                        <input type="time" value={waktuSelesai} onChange={e=>setWaktuSelesai(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-mono" />
                      </div>
                    </div>
                 </div>
                 
                 <div>
                    <label className="block text-xs font-bold uppercase tracking-[0.1em] text-slate-600 mb-3">Kelengkapan Atribut Mengajar</label>
                    <div className="flex flex-wrap gap-4">
                       <label className="flex items-center gap-3 cursor-pointer bg-white px-5 py-3.5 rounded-2xl border border-slate-200 hover:border-emerald-300 transition-colors shadow-sm">
                         <input type="checkbox" checked={atribut.kopiah} onChange={e=>setAtribut({...atribut, kopiah: e.target.checked})} className="rounded text-emerald-600 focus:ring-emerald-500 w-5 h-5 border-slate-300" />
                         <span className="text-sm font-bold text-slate-700">Kopiah / Khimar</span>
                       </label>
                       <label className="flex items-center gap-3 cursor-pointer bg-white px-5 py-3.5 rounded-2xl border border-slate-200 hover:border-emerald-300 transition-colors shadow-sm">
                         <input type="checkbox" checked={atribut.nametag} onChange={e=>setAtribut({...atribut, nametag: e.target.checked})} className="rounded text-emerald-600 focus:ring-emerald-500 w-5 h-5 border-slate-300" />
                         <span className="text-sm font-bold text-slate-700">Nametag</span>
                       </label>
                       <label className="flex items-center gap-3 cursor-pointer bg-white px-5 py-3.5 rounded-2xl border border-slate-200 hover:border-emerald-300 transition-colors shadow-sm">
                         <input type="checkbox" checked={atribut.bros} onChange={e=>setAtribut({...atribut, bros: e.target.checked})} className="rounded text-emerald-600 focus:ring-emerald-500 w-5 h-5 border-slate-300" />
                         <span className="text-sm font-bold text-slate-700">Bros Markaz</span>
                       </label>
                    </div>
                 </div>
                 
                 <div className="pt-6 border-t border-emerald-100/50 flex justify-end">
                    <button
                      onClick={handleSave}
                      disabled={isSaving || !tanggal || !sesi}
                      className="w-full md:w-auto rounded-full bg-emerald-600 px-8 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 hover:shadow-md hover:shadow-emerald-200 disabled:opacity-50"
                    >
                      {isSaving ? "Menyimpan Data..." : "Simpan Absensi Final"}
                    </button>
                 </div>
              </div>
            )}
          </div>
        )}
        </>
        )}
      </section>
    </div>
  );
}
