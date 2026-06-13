"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { toast } from "react-hot-toast";
import { Clock, Lock, CheckCircle2, UserPlus, X, Save, AlertCircle, RefreshCw } from "lucide-react";

// Helper: Hitung sesi aktif, sesi berikutnya, dan status libur
function computeSessionState(jadwalConfig: any, programList: any[], kelasId: string | null, tanggal: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit', minute: '2-digit', hour12: false
  });
  const parts = formatter.formatToParts(new Date());
  const curHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
  const curMin = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
  const curVal = curHour * 60 + curMin;

  const activeSesis: string[] = [];
  let nextSession = null;
  let minDiff = Infinity;

  if (!jadwalConfig || !jadwalConfig.globalSesi) {
    return { activeSesis: [], nextSession: null, isResting: true };
  }

  let programId = null;
  if (kelasId && kelasId !== "ALL" && kelasId !== "UNASSIGNED") {
    if (kelasId.startsWith("PROGRAM_")) {
      programId = kelasId.replace("PROGRAM_", "");
    } else {
      const prog = programList.find(p => p.kelasList.some((k:any) => k.id === kelasId));
      if (prog) programId = prog.id;
    }
  }

  let finalJadwal = [...jadwalConfig.globalSesi];

  if (programId) {
    const tambahan = jadwalConfig.sesiTambahan.filter((s:any) => s.programId === programId && s.isActive);
    tambahan.forEach((t:any) => {
      finalJadwal.push({
        sesi: t.sesi,
        label: "Sesi " + t.sesi.replace("SESI_", ""),
        jamBuka: t.jamBuka,
        jamTutup: t.jamTutup,
        toleransiMenit: t.toleransiMenit,
        isActive: t.isActive
      });
    });

    const isTaqwimDate = jadwalConfig.taqwim.tanggalList.some((t:any) => t.programId === programId && t.tanggal.startsWith(tanggal));
    if (isTaqwimDate) {
      const taqwimConf = jadwalConfig.taqwim.configs.find((c:any) => c.programId === programId && c.isActive);
      if (taqwimConf) {
        const s1Idx = finalJadwal.findIndex(j => j.sesi === "SESI_1");
        if (s1Idx !== -1) {
          finalJadwal[s1Idx] = {
            ...finalJadwal[s1Idx],
            jamBuka: taqwimConf.jamBuka,
            jamTutup: taqwimConf.jamTutup,
            toleransiMenit: taqwimConf.toleransiMenit,
            label: "Sesi Taqwim"
          };
        }
      }
    }
  }

  for (const jadwal of finalJadwal) {
    if (!jadwal.isActive) continue;
    const [bukaH, bukaM] = jadwal.jamBuka.split(':').map(Number);
    const [tutupH, tutupM] = jadwal.jamTutup.split(':').map(Number);
    const bukaVal = bukaH * 60 + bukaM;
    const tutupVal = tutupH * 60 + tutupM;
    const isCrossMidnight = (tutupH * 60 + tutupM) < bukaVal;

    let isActive = false;
    if (isCrossMidnight) {
      isActive = curVal >= bukaVal || curVal <= (tutupVal % 1440);
    } else {
      isActive = curVal >= bukaVal && curVal <= tutupVal;
    }

    if (isActive) {
      activeSesis.push(jadwal.sesi);
    } else {
      if (bukaVal > curVal && bukaVal - curVal < minDiff) {
        minDiff = bukaVal - curVal;
        nextSession = jadwal;
      }
    }
  }

  activeSesis.sort((a,b) => {
    const na = parseInt(a.replace("SESI_", ""));
    const nb = parseInt(b.replace("SESI_", ""));
    return na - nb;
  });

  return { activeSesis, nextSession, isResting: activeSesis.length === 0 && !nextSession };
}

// Helper: Cache key untuk form pengajar
function getCacheKey(tanggal: string, sesi: string, kelasId: string): string {
  return `absen_pengajar_${tanggal}_${sesi}_${kelasId}`;
}
function saveFormCache(tanggal: string, sesi: string, kelasId: string, data: any) {
  try { localStorage.setItem(getCacheKey(tanggal, sesi, kelasId), JSON.stringify(data)); } catch { }
}
function loadFormCache(tanggal: string, sesi: string, kelasId: string): any | null {
  try {
    const raw = localStorage.getItem(getCacheKey(tanggal, sesi, kelasId));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function clearFormCache(tanggal: string, sesi: string, kelasId: string) {
  try { localStorage.removeItem(getCacheKey(tanggal, sesi, kelasId)); } catch { }
}

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
type SesiKelas = "SESI_1" | "SESI_2" | "SESI_3" | "SESI_4" | "SESI_5" | "SESI_6" | "SESI_7" | "SESI_8" | "SESI_9" | "SESI_10";

export function AbsensiKelasClient({
  programList,
  allowedClassIds = null,
  userRole,
  teacherSessions = [],
  allPengajarSesi = []
}: {
  programList: any[];
  allowedClassIds?: string[] | null;
  userRole?: string;
  teacherSessions?: { sesi: string; kelasId: string }[];
  allPengajarSesi?: { sesi: string; kelasId: string; user: { id: string; nama: string } }[];
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

  const isTeacher = userRole !== "ADMIN" && allowedClassIds !== null;
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const activeSessionRef = useRef<string | null>(null);
  const loadedSessionRef = useRef({ sesi: "", kelasId: "" });
  const [hasCheckedSession, setHasCheckedSession] = useState(false);
  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [jadwalSesiList, setJadwalSesiList] = useState<any>(null);

  // State untuk Absen Pengajar
  const [materi, setMateri] = useState("");
  const [waktuMulai, setWaktuMulai] = useState("");
  const [waktuSelesai, setWaktuSelesai] = useState("");
  const [atribut, setAtribut] = useState({ kopiah: false, nametag: false, bros: false });
  const [kecerdasan, setKecerdasan] = useState("");
  const [isBadalMode, setIsBadalMode] = useState(false);
  const [showBadalModal, setShowBadalModal] = useState(false);
  const [badalTargetKelasId, setBadalTargetKelasId] = useState("");
  const [isSaved, setIsSaved] = useState(false); // Indikator apakah absen sudah tersimpan

  // Admin Backup Mode
  const [showAdminPengajarForm, setShowAdminPengajarForm] = useState(false);
  const [selectedAdminPengajarId, setSelectedAdminPengajarId] = useState("");
  const adminFormRef = useRef<HTMLDivElement>(null);

  const [activeSessionsList, setActiveSessionsList] = useState<string[]>([]);
  const [nextSessionInfo, setNextSessionInfo] = useState<any | null>(null);
  const [isResting, setIsResting] = useState(false);

  // Sync ref dengan state
  useEffect(() => { activeSessionRef.current = activeSession; }, [activeSession]);

  useEffect(() => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(new Date());
    const y = parts.find(p => p.type === 'year')?.value;
    const m = parts.find(p => p.type === 'month')?.value;
    const d = parts.find(p => p.type === 'day')?.value;
    setTanggal(`${y}-${m}-${d}`);

    // Fetch jadwal sesi to determine active session
    fetch("/api/admin/jadwal-sesi/full")
      .then(res => res.json())
      .then(data => {
        setJadwalSesiList(data);
        const { activeSesis, nextSession, isResting } = computeSessionState(data, programList, kelasId, `${y}-${m}-${d}`);
        setActiveSessionsList(activeSesis);
        setNextSessionInfo(nextSession);
        setIsResting(isResting);

        const currentActive = activeSesis.length > 0 ? activeSesis[0] : null;

        if (isTeacher) {
          if (currentActive) {
            const teachingThisSession = teacherSessions.find(ts => ts.sesi === currentActive);
            setSesi(currentActive as SesiKelas);
            if (teachingThisSession) {
              setKelasId(teachingThisSession.kelasId);
              setActiveClassId(teachingThisSession.kelasId);
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

  const isCompleted = useMemo(() => {
    if (!isTeacher) return false;
    const statBelum = santriList.length - Object.keys(absenMap).length;
    return statBelum === 0 && santriList.length > 0 && isSaved;
  }, [isTeacher, santriList, absenMap, isSaved]);

  const isCompletedRef = useRef(isCompleted);
  useEffect(() => {
    isCompletedRef.current = isCompleted;
  }, [isCompleted]);

  // Efek interval untuk auto-switch sesi — TANPA activeSession di dependency
  useEffect(() => {
    if (!isTeacher || !jadwalSesiList || !jadwalSesiList.globalSesi) return;

    const intervalId = setInterval(() => {
      const { activeSesis, nextSession, isResting } = computeSessionState(jadwalSesiList, programList, kelasId, tanggal);
      setActiveSessionsList(activeSesis);
      setNextSessionInfo(nextSession);
      setIsResting(isResting);

      const prevSession = activeSessionRef.current;

      let currentActive: string | null = null;
      if (activeSesis.length > 0) {
        if (prevSession && activeSesis.includes(prevSession)) {
          if (isCompletedRef.current && activeSesis.length > 1) {
            const idx = activeSesis.indexOf(prevSession);
            currentActive = idx + 1 < activeSesis.length ? activeSesis[idx + 1] : prevSession;
          } else {
            currentActive = prevSession;
          }
        } else {
          currentActive = activeSesis[0];
        }
      }

      if (prevSession !== currentActive) {
        setActiveSession(currentActive);
        setIsBadalMode(false);
        setIsSaved(false);
        if (currentActive) {
          const teachingThisSession = teacherSessions.find(ts => ts.sesi === currentActive);
          setSesi(currentActive as SesiKelas);
          if (teachingThisSession) {
            setKelasId(teachingThisSession.kelasId);
            setActiveClassId(teachingThisSession.kelasId);
          }
          toast("Sesi berganti otomatis ke " + currentActive.replace('_', ' '), { icon: '🔄' });
        } else {
          setSesi("" as SesiKelas);
          toast("Sesi saat ini telah berakhir", { icon: '🔒' });
        }
      }
    }, 10000);

    return () => clearInterval(intervalId);
  }, [isTeacher, jadwalSesiList, teacherSessions]); // ← activeSession DIHAPUS dari deps

  // Auto-save form pengajar ke localStorage saat berubah
  useEffect(() => {
    if (!isTeacher || !tanggal || !sesi || !kelasId) return;
    // Cegah save data lama ke sesi baru sebelum data sesi baru selesai di-fetch
    if (loadedSessionRef.current.sesi !== sesi || loadedSessionRef.current.kelasId !== kelasId) return;
    const data = { materi, waktuMulai, waktuSelesai, atribut, kecerdasan };
    saveFormCache(tanggal, sesi, kelasId, data);
  }, [isTeacher, tanggal, sesi, kelasId, materi, waktuMulai, waktuSelesai, atribut, kecerdasan]);

  useEffect(() => {
    if (!tanggal || !sesi) return;
    if (isTeacher && !hasCheckedSession) return;

    // Cegah kebocoran: Jika dia PENGAJAR tapi tidak punya kelas satupun (baru dibuat, belum dijadwal)
    if (isTeacher && allowedClassIds && allowedClassIds.length === 0) {
      setSantriList([]);
      setAbsenMap({});
      return;
    }

    let ignore = false;
    const fetchData = async () => {
      setIsLoading(true);
      setIsSaved(false);
      try {
        const res = await fetch(`/api/admin/absensi/kelas?tanggal=${tanggal}&sesi=${sesi}&kelasId=${kelasId}`);
        const data = await res.json();

        if (ignore) return;

        if (data.santriList) {
          setSantriList(data.santriList);
        } else {
          setSantriList([]);
        }

        // Prioritas: data dari server > cache localStorage
        if (data.absenPengajarData) {
          setMateri(data.absenPengajarData.materi || "");
          setWaktuMulai(data.absenPengajarData.waktuMulai || "");
          setWaktuSelesai(data.absenPengajarData.waktuSelesai || "");
          setAtribut({
            kopiah: !!data.absenPengajarData.atributKopiah,
            nametag: !!data.absenPengajarData.atributNametag,
            bros: !!data.absenPengajarData.atributBros,
          });
          setKecerdasan(data.absenPengajarData.kecerdasan || "");
          setIsSaved(true); // Data sudah tersimpan di server
        } else {
          // Coba muat dari cache localStorage
          const cached = loadFormCache(tanggal, sesi, kelasId);
          if (cached) {
            setMateri(cached.materi || "");
            setWaktuMulai(cached.waktuMulai || "");
            setWaktuSelesai(cached.waktuSelesai || "");
            setAtribut(cached.atribut || { kopiah: false, nametag: false, bros: false });
            setKecerdasan(cached.kecerdasan || "");
          } else {
            setMateri("");
            setWaktuMulai("");
            setWaktuSelesai("");
            setAtribut({ kopiah: false, nametag: false, bros: false });
            setKecerdasan("");
          }
          setIsSaved(false);
        }

        const newMap: Record<string, any> = {};
        if (data.absenData) {
          data.absenData.forEach((a: any) => {
            newMap[a.riwayatId] = { status: a.status, keterangan: a.keterangan || "" };
          });
          // Jika ada data absen santri yang sudah tersimpan, tandai saved
          if (Object.keys(newMap).length > 0 && data.absenPengajarData) {
            setIsSaved(true);
          }
        }
        setAbsenMap(newMap);

        // Tandai bahwa data untuk sesi ini sudah selesai dimuat (mengizinkan auto-save)
        loadedSessionRef.current = { sesi, kelasId };
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
    setIsSaved(false);
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
      if (isTeacher || (userRole === "ADMIN" && showAdminPengajarForm)) {
        if (!materi || !waktuMulai || !waktuSelesai) {
          toast.error("Mohon lengkapi Form Absensi Pengajar (Materi dan Waktu)");
          setIsSaving(false);
          return;
        }
        // Admin backup: pilih pengajar bersifat opsional, jika ada maka dikirim
        payload.absenPengajar = {
          materi,
          waktuMulai,
          waktuSelesai,
          atributKopiah: atribut.kopiah,
          atributNametag: atribut.nametag,
          atributBros: atribut.bros,
          kecerdasan: kecerdasan || null,
          isBadal: isBadalMode
        };
        if (userRole === "ADMIN" && showAdminPengajarForm) {
          payload.targetUserId = selectedAdminPengajarId;
        }
      }

      const res = await fetch("/api/admin/absensi/kelas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Sesi login berakhir — arahkan ke halaman login
      if (res.status === 401) {
        toast.error("Sesi login telah berakhir. Mengalihkan ke halaman login...", { duration: 3000 });
        setTimeout(() => { window.location.href = "/login"; }, 2000);
        setIsSaving(false);
        return;
      }

      const result = await res.json();
      if (result.success) {
        toast.success(`Berhasil menyimpan data absensi kelas`);
        setIsSaved(true);
        // Bersihkan cache setelah tersimpan ke server
        if (isTeacher) clearFormCache(tanggal, sesi, kelasId);
      } else {
        toast.error(result.error || "Gagal menyimpan absensi");
      }
    } catch (e) {
      toast.error("Terjadi kesalahan sistem");
    } finally {
      setIsSaving(false);
    }
  };

  const allClassesOptions = useMemo(() => {
    const list: { id: string; label: string; group: string }[] = [];
    programList.forEach((program) => {
      if (program.kelasList.length > 0) {
        program.kelasList.forEach((k: any) => {
          list.push({ id: k.id, label: k.nama, group: program.nama_indo });
        });
      }
    });
    return list;
  }, [programList]);


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

  // State animasi refresh button
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleFloatingRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => window.location.reload(), 300);
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden neu-card-white">
        <div className="flex flex-col gap-4 border-b border-[var(--color-surface-dark)] p-6 md:flex-row md:items-end md:justify-between bg-[var(--color-surface-light)]">
          {isTeacher ? (
            <div className="flex flex-col gap-2 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)] w-24">Tanggal</span>
                <span className="text-sm font-bold text-[var(--color-primary)] bg-[var(--color-primary-50)] px-3 py-1 rounded-lg border border-[var(--color-primary-50)]">
                  {tanggal ? tanggal.split('-').reverse().join('-') : ""}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)] w-24">Sesi Aktif</span>
                <span className={`text-sm font-bold px-3 py-1 rounded-lg border ${activeSession ? 'text-[var(--color-primary)] bg-[var(--color-primary-50)] border-[var(--color-primary-50)]' : 'text-[var(--color-danger)] bg-[var(--color-danger-light)] border-[var(--color-danger-light)]'}`}>
                  {activeSession ? activeSession.replace('_', ' ') : "Tidak ada"}
                </span>
              </div>
              {activeSession && jadwalSesiList && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)] w-24">Waktu</span>
                  <span className="text-sm font-medium text-[var(--color-text-muted)] bg-[var(--color-secondary)] px-3 py-1 rounded-lg border border-[var(--color-surface)]">
                    {(() => {
                      let pId = null;
                      if (kelasId && kelasId !== "ALL" && kelasId !== "UNASSIGNED") {
                        if (kelasId.startsWith("PROGRAM_")) pId = kelasId.replace("PROGRAM_", "");
                        else {
                          const prog = programList.find(p => p.kelasList.some((k:any) => k.id === kelasId));
                          if (prog) pId = prog.id;
                        }
                      }
                      let j = null;
                      if (activeSession === "SESI_1" && pId) {
                         const isTaqwimDate = jadwalSesiList.taqwim?.tanggalList.some((t:any) => t.programId === pId && t.tanggal.startsWith(tanggal));
                         if (isTaqwimDate) {
                            j = jadwalSesiList.taqwim.configs.find((c:any) => c.programId === pId && c.isActive);
                         }
                      }
                      if (!j) j = jadwalSesiList.globalSesi?.find((x: any) => x.sesi === activeSession);
                      if (!j && jadwalSesiList.sesiTambahan) j = jadwalSesiList.sesiTambahan.find((x: any) => x.sesi === activeSession && x.programId === pId);
                      
                      if (j) return `${j.jamBuka} - ${j.jamTutup} (Dispensasi: ${j.toleransiMenit} mnt)`;
                      return "-";
                    })()}
                  </span>
                </div>
              )}
              {activeClassId && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)] w-24">Kelas</span>
                  <span className={`text-sm font-bold px-3 py-1 rounded-lg border ${isBadalMode ? 'text-[var(--color-warning)] bg-[var(--color-warning-light)] border-[var(--color-warning)]' : 'text-indigo-700 bg-indigo-50 border-indigo-100'}`}>
                    {allClassesOptions.find(o => o.id === activeClassId)?.label || activeClassId}
                    {isBadalMode && " (Badal)"}
                  </span>
                </div>
              )}
              {activeSession && (
                <div className="mt-2 flex">
                  {isBadalMode ? (
                    <button onClick={() => { setIsBadalMode(false); setActiveClassId(teacherSessions.find(ts => ts.sesi === activeSession)?.kelasId || null); setKelasId(teacherSessions.find(ts => ts.sesi === activeSession)?.kelasId || allowedClassIds?.[0] || ""); }} className="flex items-center gap-2 text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-surface-dark)] rounded-lg px-3 py-1.5 transition-colors">Batal Badal</button>
                  ) : (
                    <button onClick={() => setShowBadalModal(true)} className="flex items-center gap-2 text-xs font-bold text-[var(--color-warning)] bg-[var(--color-warning-light)] hover:bg-[var(--color-warning-light)] border border-[var(--color-warning)] rounded-lg px-3 py-1.5 transition-colors">
                      <UserPlus className="w-4 h-4" />
                      Jadi Guru Badal
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-4 flex-wrap w-full md:w-auto">
              <div className="w-full md:w-auto">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                  Tanggal
                </label>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full rounded-2xl border border-[var(--color-surface-dark)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)]"
                />
              </div>

              <div className="w-full md:w-auto">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                  Sesi
                </label>
                <select
                  value={sesi}
                  onChange={(e) => setSesi(e.target.value as SesiKelas)}
                  className="w-full rounded-2xl border border-[var(--color-surface-dark)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)]"
                >
                  <option value="SESI_1">Sesi 1</option>
                  <option value="SESI_2">Sesi 2</option>
                  <option value="SESI_3">Sesi 3</option>
                  <option value="SESI_4">Sesi 4</option>
                  <option value="SESI_5">Sesi 5</option>
                  <option value="SESI_6">Sesi 6</option>
                  {jadwalSesiList?.sesiTambahan?.filter((s:any) => {
                     // Cari programId yang aktif
                     let pId = null;
                     if (kelasId && kelasId !== "ALL" && kelasId !== "UNASSIGNED") {
                       if (kelasId.startsWith("PROGRAM_")) pId = kelasId.replace("PROGRAM_", "");
                       else {
                         const prog = programList.find(p => p.kelasList.some((k:any) => k.id === kelasId));
                         if (prog) pId = prog.id;
                       }
                     }
                     return s.programId === pId;
                  }).map((s:any) => (
                    <option key={s.sesi} value={s.sesi}>Sesi {s.sesi.replace('SESI_', '')}</option>
                  ))}
                </select>
              </div>

              <div className="w-full md:w-auto">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                  Filter Kelas
                </label>
                <select
                  value={kelasId}
                  onChange={(e) => setKelasId(e.target.value)}
                  className="w-full rounded-2xl border border-[var(--color-surface-dark)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)]"
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
              className="rounded-full bg-[var(--color-surface-dark)] px-4 py-2 text-xs font-bold text-[var(--color-text)] transition hover:bg-[var(--color-surface-dark)]"
            >
              Hadirkan Semua
            </button>
            {userRole === "ADMIN" && (
              <button
                onClick={() => {
                  const newState = !showAdminPengajarForm;
                  setShowAdminPengajarForm(newState);
                  if (newState) {
                    setTimeout(() => adminFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
                  }
                }}
                className={`rounded-full px-4 py-2 text-xs font-bold transition ${showAdminPengajarForm
                  ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                  : "bg-[var(--color-surface-dark)] text-[var(--color-text)] hover:bg-gray-200"
                  }`}
              >
                {showAdminPengajarForm ? "Tutup Form Pengajar" : "📝 Isi Absen Pengajar"}
              </button>
            )}
            {!isTeacher && (
              <button
                onClick={handleSave}
                disabled={isSaving || isLoading || !tanggal || !sesi}
                className="rounded-full bg-[var(--color-primary)] px-6 py-2 text-sm font-bold text-white transition hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
              >
                {isSaving ? "Menyimpan..." : "Simpan Absensi"}
              </button>
            )}
          </div>
        </div>

        {isTeacher && hasCheckedSession && !activeSession ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-[var(--color-surface-dark)] px-6 text-center shadow-sm max-w-4xl mx-auto my-8">
            {isResting ? (
              <>
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6 ring-8 ring-emerald-50/50">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </div>
                <h3 className="text-2xl font-black text-[var(--color-text)] mb-3">Selamat Beristirahat</h3>
                <p className="text-base text-[var(--color-text-muted)] max-w-md font-medium leading-relaxed">
                  Semua sesi untuk hari ini telah selesai atau sedang hari libur. Terima kasih atas dedikasi Anda.
                </p>
              </>
            ) : nextSessionInfo ? (
              <>
                <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-6 ring-8 ring-amber-50/50">
                  <Clock className="w-10 h-10 text-amber-500" />
                </div>
                <h3 className="text-2xl font-black text-[var(--color-text)] mb-3">Sesi Belum Dimulai</h3>
                <p className="text-base text-[var(--color-text-muted)] max-w-md mb-8 font-medium leading-relaxed">
                  Sesi berikutnya adalah <strong className="text-[var(--color-text)] px-1">{nextSessionInfo.label}</strong> yang akan dimulai pada jam <strong className="text-[var(--color-text)] px-1">{nextSessionInfo.jamBuka} WIB</strong>.
                </p>
                <div className="inline-flex items-center gap-3 px-6 py-3 bg-[var(--color-surface-light)] rounded-full text-sm font-bold text-[var(--color-text-muted)] border border-[var(--color-surface-dark)]">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                  </span>
                  Sistem akan otomatis berpindah...
                </div>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-[var(--color-surface)] rounded-full flex items-center justify-center mb-6">
                  <Lock className="w-10 h-10 text-[var(--color-text-subtle)]" />
                </div>
                <h3 className="text-2xl font-black text-[var(--color-text)] mb-3">Sesi Telah Ditutup</h3>
                <p className="text-base text-[var(--color-text-muted)] mt-2 font-medium">Absensi hanya bisa dilakukan saat sesi sedang aktif.</p>
              </>
            )}
          </div>
        ) : isTeacher && hasCheckedSession && activeSession && !teacherSessions.some(ts => ts.sesi === activeSession) && !isBadalMode ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-[var(--color-surface-dark)] px-6 text-center shadow-sm max-w-4xl mx-auto my-8">
            <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-6 ring-8 ring-amber-50/50">
              <UserPlus className="w-10 h-10 text-amber-500" />
            </div>
            <h3 className="text-2xl font-black text-[var(--color-text)] mb-3">Bukan Jadwal Mengajar Anda</h3>
            <p className="text-base text-[var(--color-text-muted)] max-w-md font-medium leading-relaxed">
              Anda tidak memiliki jadwal mengajar di {activeSession.replace('_', ' ')}. Jika Anda diminta untuk menggantikan pengajar lain, silakan aktifkan mode Guru Badal.
            </p>
            <button
              onClick={() => setShowBadalModal(true)}
              className="mt-8 rounded-full bg-[var(--color-warning)] px-8 py-3 text-sm font-bold text-white transition hover:bg-amber-600 shadow-md shadow-amber-200"
            >
              Mulai Jadi Guru Badal
            </button>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="flex flex-wrap gap-4 border-b border-[var(--color-surface-dark)] px-6 py-4 bg-white">
              <div className="flex items-center gap-2 text-sm font-bold">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                <span className="text-[var(--color-text)]">Hadir: {statHadir}</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-bold">
                <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
                <span className="text-[var(--color-text)]">Izin: {statIzin}</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-bold">
                <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                <span className="text-[var(--color-text)]">Sakit: {statSakit}</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-bold">
                <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                <span className="text-[var(--color-text)]">Alpha: {statAlpha}</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-bold pl-4 border-l border-[var(--color-surface-dark)]">
                <span className="text-[var(--color-text-subtle)]">Belum Diabsen: {belumDiabsen}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="p-8 text-center text-sm font-semibold text-[var(--color-text-muted)]">Memuat data santri...</div>
              ) : (
                <table className="min-w-full divide-y divide-[var(--color-surface-dark)] text-left">
                  <thead className="bg-[var(--color-secondary)] text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                    <tr>
                      <th className="px-4 py-4 text-center w-16">#</th>
                      <th className="px-6 py-4">Santri</th>
                      <th className="px-6 py-4 min-w-[300px]">Status Kehadiran</th>
                      <th className="px-6 py-4">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-surface)] text-sm text-[var(--color-text-muted)]">
                    {santriList.map((santri, index) => {
                      const currentStatus = absenMap[santri.riwayatId]?.status;
                      const currentKet = absenMap[santri.riwayatId]?.keterangan || "";

                      return (
                        <tr key={santri.riwayatId} className="hover:bg-[var(--color-surface-light)]">
                          <td className="px-4 py-4 text-center font-bold text-[var(--color-text-subtle)]">{index + 1}</td>
                          <td className="px-6 py-4">
                            <p className="font-bold text-[var(--color-text)]">{santri.nama}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center rounded-md bg-[var(--color-surface)] px-2 py-0.5 text-xs font-medium text-[var(--color-text-muted)]">
                                {santri.kelasNama ?? santri.programNama ?? "Tanpa Kelas"}
                              </span>
                              {santri.gender === "BANIN" ? (
                                <span className="inline-flex items-center rounded-md bg-[var(--color-primary-50)] px-2 py-0.5 text-xs font-medium text-[var(--color-primary)]">BANIN</span>
                              ) : santri.gender === "BANAT" ? (
                                <span className="inline-flex items-center rounded-md bg-[var(--color-danger-light)] px-2 py-0.5 text-xs font-medium text-[var(--color-danger)]">BANAT</span>
                              ) : (
                                <span className="inline-flex items-center rounded-md bg-[var(--color-secondary)] px-2 py-0.5 text-xs font-medium text-[var(--color-text)]">{santri.gender}</span>
                              )}
                              {santri.kategori === "BARU" ? (
                                <span className="inline-flex items-center rounded-md bg-[var(--color-primary-50)] px-2 py-0.5 text-xs font-medium text-[var(--color-primary)] capitalize">Baru</span>
                              ) : santri.kategori === "LAMA" ? (
                                <span className="inline-flex items-center rounded-md bg-[var(--color-warning-light)] px-2 py-0.5 text-xs font-medium text-[var(--color-warning)] capitalize">Lama</span>
                              ) : santri.kategori === "KSU" ? (
                                <span className="inline-flex items-center rounded-md bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700 uppercase">KSU</span>
                              ) : (
                                <span className="inline-flex items-center rounded-md bg-[var(--color-secondary)] px-2 py-0.5 text-xs font-medium text-[var(--color-text)] capitalize">{santri.kategori ?? "-"}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              {(["HADIR", "IZIN", "SAKIT", "ALPHA"] as AbsenStatus[]).map((st) => (
                                <button
                                  key={st}
                                  onClick={() => handleStatusChange(santri.riwayatId, st)}
                                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all ${currentStatus === st
                                    ? st === "HADIR" ? "bg-emerald-500 text-white shadow-emerald-200 shadow-sm"
                                      : st === "IZIN" ? "bg-indigo-500 text-white shadow-indigo-200 shadow-sm"
                                        : st === "SAKIT" ? "bg-amber-500 text-white shadow-amber-200 shadow-sm"
                                          : "bg-rose-500 text-white shadow-rose-200 shadow-sm"
                                    : "bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-dark)]"
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
                              className="w-full rounded-xl border border-[var(--color-surface-dark)] bg-white px-3 py-1.5 text-sm outline-none transition focus:border-[var(--color-primary)]"
                            />
                          </td>
                        </tr>
                      )
                    })}
                    {santriList.length === 0 && !isLoading && (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-[var(--color-text-muted)] font-medium">
                          Tidak ada santri yang ditemukan pada filter ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {(
              (isTeacher && activeSession && (teacherSessions.some(ts => ts.sesi === activeSession && ts.kelasId === kelasId) || isBadalMode)) ||
              (userRole === "ADMIN" && showAdminPengajarForm)
            ) && (
                <div ref={adminFormRef} className="p-6 md:p-8 bg-[var(--color-surface-light)] border-t border-[var(--color-surface-dark)]">
                  <div className={`border rounded-3xl p-8 space-y-6 shadow-sm max-w-4xl mx-auto ${isSaved ? 'bg-[var(--color-primary-50)]/40 border-[var(--color-primary-50)]' : 'bg-white border-[var(--color-surface-dark)]'}`}>
                    {/* Header dengan status indikator */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-surface-dark)]/30 pb-5">
                      <div>
                        <h3 className="text-lg font-bold text-[var(--color-primary-dark)] flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-[var(--color-primary)]" />
                          Formulir Kehadiran Pengajar {userRole === "ADMIN" && "(Admin Backup)"}
                        </h3>
                        <p className="text-xs font-medium text-[var(--color-text-muted)] mt-1">Lengkapi data mengajar {userRole === "ADMIN" ? "pengajar" : "Anda"}. Data akan tersimpan otomatis di perangkat ini.</p>
                      </div>
                      {/* Status Badge */}
                      {isSaved ? (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-primary-100)] border border-[var(--color-primary-50)]">
                          <Save className="w-4 h-4 text-[var(--color-primary)]" />
                          <span className="text-xs font-bold text-[var(--color-primary)]">Tersimpan di Server</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-200">
                          <AlertCircle className="w-4 h-4 text-amber-600" />
                          <span className="text-xs font-bold text-amber-600">Belum Disimpan</span>
                        </div>
                      )}
                    </div>

                    {userRole === "ADMIN" && (
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-text-muted)] mb-2">Pilih Pengajar</label>
                        <select
                          value={selectedAdminPengajarId}
                          onChange={(e) => setSelectedAdminPengajarId(e.target.value)}
                          className="w-full rounded-2xl border border-[var(--color-surface-dark)] bg-white px-4 py-3 text-sm focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 outline-none transition-all"
                        >
                          <option value="">-- Pilih Pengajar --</option>
                          {(() => {
                            // Kumpulkan semua user unik
                            const uniqueUsersMap = new Map<string, { id: string, nama: string }>();
                            allPengajarSesi.forEach(ps => {
                              if (!uniqueUsersMap.has(ps.user.id)) {
                                uniqueUsersMap.set(ps.user.id, ps.user);
                              }
                            });

                            // Filter pengajar yang BENAR-BENAR terjadwal di tab ini
                            const matchedTeachers = allPengajarSesi
                              .filter(ps => ps.sesi === sesi && ps.kelasId === kelasId)
                              .map(ps => ps.user);

                            // Sisa pengajar lain (sebagai fallback/badal admin)
                            const otherTeachers = Array.from(uniqueUsersMap.values())
                              .filter(u => !matchedTeachers.some(mt => mt.id === u.id))
                              .sort((a, b) => a.nama.localeCompare(b.nama));

                            const currentKelasLabel = allClassesOptions.find(c => c.id === kelasId)?.label ?? kelasId;
                            const currentSesiLabel = sesi ? sesi.replace('SESI_', 'Sesi ') : "";

                            return (
                              <>
                                {matchedTeachers.length > 0 && (
                                  <optgroup label={`Terjadwal di ${currentSesiLabel} | ${currentKelasLabel}`}>
                                    {matchedTeachers.map(u => (
                                      <option key={`matched-${u.id}`} value={u.id}>
                                        {u.nama}
                                      </option>
                                    ))}
                                  </optgroup>
                                )}
                                {otherTeachers.length > 0 && (
                                  <optgroup label="Pengajar Lain (Sebagai Pengganti)">
                                    {otherTeachers.map(u => (
                                      <option key={`other-${u.id}`} value={u.id}>
                                        {u.nama}
                                      </option>
                                    ))}
                                  </optgroup>
                                )}
                              </>
                            );
                          })()}
                        </select>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-text-muted)] mb-2">Materi Pelajaran Hari Ini</label>
                        <input type="text" value={materi} onChange={e => { setMateri(e.target.value); setIsSaved(false); }} placeholder="Contoh: Nahwu Bab Isim" className="w-full rounded-2xl border border-[var(--color-surface-dark)] bg-white px-4 py-3 text-sm focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 outline-none transition-all" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-text-muted)] mb-2">Jam Masuk (24H)</label>
                          <input type="text" placeholder="Contoh: 15:30" maxLength={5} value={waktuMulai} onChange={e => {
                            let val = e.target.value.replace(/[^0-9:]/g, '');
                            if (val.length === 2 && !val.includes(':') && e.target.value.length > waktuMulai.length) val += ':';
                            setWaktuMulai(val);
                            setIsSaved(false);
                          }} className="w-full rounded-2xl border border-[var(--color-surface-dark)] bg-white px-4 py-3 text-sm focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 outline-none transition-all font-mono placeholder:text-[var(--color-text-subtle)]" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-text-muted)] mb-2">Jam Selesai (24H)</label>
                          <input type="text" placeholder="Contoh: 17:00" maxLength={5} value={waktuSelesai} onChange={e => {
                            let val = e.target.value.replace(/[^0-9:]/g, '');
                            if (val.length === 2 && !val.includes(':') && e.target.value.length > waktuSelesai.length) val += ':';
                            setWaktuSelesai(val);
                            setIsSaved(false);
                          }} className="w-full rounded-2xl border border-[var(--color-surface-dark)] bg-white px-4 py-3 text-sm focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 outline-none transition-all font-mono placeholder:text-[var(--color-text-subtle)]" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-text-muted)] mb-3">Kelengkapan Atribut Mengajar</label>
                        <div className="flex flex-wrap gap-4">
                          <label className="flex items-center gap-3 cursor-pointer bg-white px-5 py-3.5 rounded-2xl border border-[var(--color-surface-dark)] hover:border-[var(--color-primary-100)] transition-colors shadow-sm">
                            <input type="checkbox" checked={atribut.kopiah} onChange={e => { setAtribut({ ...atribut, kopiah: e.target.checked }); setIsSaved(false); }} className="rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)] w-5 h-5 border-[var(--color-surface-dark)]" />
                            <span className="text-sm font-bold text-[var(--color-text)]">Kopiah / Khimar</span>
                          </label>
                          <label className="flex items-center gap-3 cursor-pointer bg-white px-5 py-3.5 rounded-2xl border border-[var(--color-surface-dark)] hover:border-[var(--color-primary-100)] transition-colors shadow-sm">
                            <input type="checkbox" checked={atribut.nametag} onChange={e => { setAtribut({ ...atribut, nametag: e.target.checked }); setIsSaved(false); }} className="rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)] w-5 h-5 border-[var(--color-surface-dark)]" />
                            <span className="text-sm font-bold text-[var(--color-text)]">Nametag</span>
                          </label>
                          <label className="flex items-center gap-3 cursor-pointer bg-white px-5 py-3.5 rounded-2xl border border-[var(--color-surface-dark)] hover:border-[var(--color-primary-100)] transition-colors shadow-sm">
                            <input type="checkbox" checked={atribut.bros} onChange={e => { setAtribut({ ...atribut, bros: e.target.checked }); setIsSaved(false); }} className="rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)] w-5 h-5 border-[var(--color-surface-dark)]" />
                            <span className="text-sm font-bold text-[var(--color-text)]">Baju</span>
                          </label>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-text-muted)] mb-3">Basic Kecerdasan</label>
                        <select
                          value={kecerdasan}
                          onChange={(e) => { setKecerdasan(e.target.value); setIsSaved(false); }}
                          className="w-full rounded-2xl border border-[var(--color-surface-dark)] bg-white px-4 py-3 text-sm focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 outline-none transition-all"
                        >
                          <option value="">-- Pilih Jenis Kecerdasan --</option>
                          <option value="Verbal-Linguistic">Verbal-Linguistic Intelligence (الذَّكَاءُ اللُّغَوِيُّ)</option>
                          <option value="Logical-Mathematical">Logical-Mathematical Intelligence (الذَّكَاءُ الْمَنْطِقِيُّ الرِّيَاضِيُّ)</option>
                          <option value="Visual-Spatial">Visual-Spatial Intelligence (الذَّكَاءُ الْبَصَرِيُّ الْمَكَانِيُّ)</option>
                          <option value="Musical-Rhythmic">Musical-Rhythmic Intelligence (الذَّكَاءُ الْمُوسِيقِيُّ)</option>
                          <option value="Bodily-Kinesthetic">Bodily-Kinesthetic Intelligence (الذَّكَاءُ الْجَسَدِيُّ الْحَرَكِيُّ)</option>
                          <option value="Interpersonal">Interpersonal Intelligence (الذَّكَاءُ الاِجْتِمَاعِيُّ)</option>
                          <option value="Intrapersonal">Intrapersonal Intelligence (الذَّكَاءُ الذَّاتِيُّ)</option>
                          <option value="Naturalistic">Naturalistic Intelligence (الذَّكَاءُ الطَّبِيعِيُّ)</option>
                          <option value="Existential">Existential Intelligence (الذَّكَاءُ الْوُجُودِيُّ)</option>
                        </select>
                      </div>
                    </div>

                    {/* Info belum absen santri — hanya peringatan, tidak mengunci tombol */}
                    {belumDiabsen > 0 && (
                      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200">
                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                        <p className="text-sm text-amber-700 font-medium">
                          Ada <strong className="font-bold">{belumDiabsen} santri</strong> yang belum diisi statusnya. Data tetap bisa disimpan, namun santri tersebut belum tercatat.
                        </p>
                      </div>
                    )}

                    <div className="pt-6 border-t border-[var(--color-surface-dark)]/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <p className="text-xs text-[var(--color-text-subtle)] font-medium">
                        {!materi || !waktuMulai || !waktuSelesai
                          ? "⚠️ Lengkapi materi dan waktu untuk menyimpan"
                          : belumDiabsen > 0
                            ? `⚠️ ${belumDiabsen} santri belum diabsen — data tetap bisa disimpan`
                            : isSaved
                              ? "✅ Data sudah tersimpan. Anda bisa mengubah dan menyimpan ulang."
                              : "📝 Siap disimpan ke server"}
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        {isSaved && activeSessionsList.length > 1 && activeSessionsList.indexOf(activeSession || "") + 1 < activeSessionsList.length && (
                          <button
                            onClick={() => {
                              const nextSesi = activeSessionsList[activeSessionsList.indexOf(activeSession || "") + 1];
                              setActiveSession(nextSesi);
                              setIsBadalMode(false);
                              setIsSaved(false);
                              const teachingNext = teacherSessions.find(ts => ts.sesi === nextSesi);
                              setSesi(nextSesi as SesiKelas);
                              if (teachingNext) {
                                setKelasId(teachingNext.kelasId);
                                setActiveClassId(teachingNext.kelasId);
                              }
                              toast.success("Berpindah ke " + nextSesi.replace('_', ' '));
                            }}
                            className="w-full sm:w-auto rounded-full bg-emerald-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-600 shadow-md shadow-emerald-200"
                          >
                            Lanjut Sesi {activeSessionsList[activeSessionsList.indexOf(activeSession || "") + 1].replace('SESI_', '')} 👉
                          </button>
                        )}
                        <button
                          onClick={handleSave}
                          disabled={isSaving || !tanggal || !sesi || !materi || !waktuMulai || !waktuSelesai}
                          className="w-full sm:w-auto rounded-full bg-[var(--color-primary)] px-8 py-3 text-sm font-bold text-white transition hover:bg-[var(--color-primary-dark)] hover:shadow-md hover:shadow-[var(--color-primary-100)] disabled:opacity-50"
                        >
                          {isSaving ? "Menyimpan Data..." : isSaved ? "Simpan Ulang" : "Simpan Absensi Final"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Quotes Motivasi Mengajar Mobile Optimized */}
                  <div className="mt-12 mb-4 px-4 text-center max-w-2xl mx-auto">
                    <div className="relative inline-block px-8 py-4 bg-violet-50/50 rounded-3xl border border-violet-100/50">
                      <span className="text-4xl absolute top-2 left-3 text-violet-200 font-serif leading-none">"</span>
                      <p className="text-sm md:text-base font-semibold text-violet-800/80 italic relative z-10 leading-relaxed px-2">
                        Kejujuran adalah perhiasan bagi orang yang berilmu.
                      </p>
                      <span className="text-4xl absolute bottom-[-10px] right-3 text-violet-200 font-serif leading-none">"</span>
                    </div>
                  </div>
                </div>
              )}
          </>
        )}
      </section>

      {/* Badal Modal */}
      {showBadalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-text)]/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-[var(--color-text)]">Mode Guru Badal</h3>
              <button onClick={() => setShowBadalModal(false)} className="text-[var(--color-text-subtle)] hover:text-[var(--color-danger)]">
                <X className="w-6 h-6" />
              </button>
            </div>
            <p className="text-sm text-[var(--color-text-muted)] mb-6">Pilih kelas yang akan Anda gantikan (Badal) untuk sesi <strong className="text-[var(--color-text)]">{activeSession?.replace('_', ' ')}</strong> saat ini.</p>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Kelas Tujuan</label>
                <select
                  value={badalTargetKelasId}
                  onChange={(e) => setBadalTargetKelasId(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-surface-dark)] px-4 py-3 text-sm font-semibold text-[var(--color-text)] focus:border-[var(--color-primary)] outline-none"
                >
                  <option value="" disabled>-- Pilih Kelas --</option>
                  {allClassesOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.group} — {opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button onClick={() => setShowBadalModal(false)} className="w-full rounded-xl bg-[var(--color-surface)] py-3 text-sm font-bold text-[var(--color-text-muted)] hover:bg-[var(--color-surface-dark)]">Batal</button>
              <button
                onClick={() => {
                  if (badalTargetKelasId) {
                    setIsBadalMode(true);
                    setKelasId(badalTargetKelasId);
                    setActiveClassId(badalTargetKelasId);
                    setShowBadalModal(false);
                    toast.success("Mode Badal diaktifkan untuk sesi ini");
                  } else {
                    toast.error("Pilih kelas terlebih dahulu");
                  }
                }}
                className="w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-white hover:bg-[var(--color-warning)]"
              >
                Mulai Badal
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Floating Refresh Button — untuk semua pengguna halaman absen kelas */}
      <button
        onClick={handleFloatingRefresh}
        title="Refresh halaman"
        className={`fixed bottom-24 right-6 z-50 flex items-center gap-2 rounded-full px-4 py-3 text-sm font-bold text-white shadow-lg transition-all duration-300 ${
          isRefreshing
            ? "bg-emerald-400 scale-90 shadow-emerald-200"
            : "bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] hover:scale-105 shadow-[var(--color-primary-100)] active:scale-95"
        }`}
      >
        <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
        <span className="hidden sm:inline">{isRefreshing ? "Memuat..." : "Refresh"}</span>
      </button>
    </div>
  );
}
