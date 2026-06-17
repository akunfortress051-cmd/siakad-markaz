"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { toast } from "react-hot-toast";
import { Clock, Lock, CheckCircle2, UserPlus, X, Save, AlertCircle, RefreshCw, Copy } from "lucide-react";

// Helper: Hitung sesi aktif, sesi berikutnya, dan status libur
function computeSessionState(jadwalConfig: any, programList: any[], targetKelasIds: string[] | null, tanggal: string, includeAllSesiTambahan: boolean = false) {
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

  const programIds = new Set<string>();
  if (targetKelasIds) {
    targetKelasIds.forEach(kId => {
      if (kId && kId !== "ALL" && kId !== "UNASSIGNED") {
        if (kId.startsWith("PROGRAM_")) {
          programIds.add(kId.replace("PROGRAM_", ""));
        } else {
          const prog = programList.find(p => p.kelasList.some((k:any) => k.id === kId));
          if (prog) programIds.add(prog.id);
        }
      }
    });
  }

  let finalJadwal: any[] = [];

  if (programIds.size === 0) {
    finalJadwal = jadwalConfig.globalSesi ? jadwalConfig.globalSesi.map((g:any) => ({...g, programId: null})) : [];
    if (includeAllSesiTambahan && jadwalConfig.sesiTambahan) {
      jadwalConfig.sesiTambahan.filter((s:any) => s.isActive).forEach((t:any) => {
        finalJadwal.push({
          sesi: t.sesi, label: "Sesi " + t.sesi.replace("SESI_", ""),
          jamBuka: t.jamBuka, jamTutup: t.jamTutup, toleransiMenit: t.toleransiMenit,
          isActive: t.isActive, programId: t.programId
        });
      });
    }
  } else {
    programIds.forEach(pId => {
      const progJadwal = jadwalConfig.globalSesi ? jadwalConfig.globalSesi.map((g:any) => ({...g, programId: pId})) : [];
      const tambahan = jadwalConfig.sesiTambahan ? jadwalConfig.sesiTambahan.filter((s:any) => s.programId === pId && s.isActive) : [];
      tambahan.forEach((t:any) => {
        const idx = progJadwal.findIndex((g:any) => g.sesi === t.sesi);
        if (idx !== -1) {
          progJadwal[idx] = { ...progJadwal[idx], jamBuka: t.jamBuka, jamTutup: t.jamTutup, toleransiMenit: t.toleransiMenit };
        } else {
          progJadwal.push({
            sesi: t.sesi, label: "Sesi " + t.sesi.replace("SESI_", ""),
            jamBuka: t.jamBuka, jamTutup: t.jamTutup, toleransiMenit: t.toleransiMenit,
            isActive: t.isActive, programId: pId
          });
        }
      });
      finalJadwal.push(...progJadwal);
    });

    if (includeAllSesiTambahan && jadwalConfig.sesiTambahan) {
      const extra = jadwalConfig.sesiTambahan.filter((s:any) => !programIds.has(s.programId) && s.isActive);
      extra.forEach((t:any) => {
        finalJadwal.push({
          sesi: t.sesi, label: "Sesi " + t.sesi.replace("SESI_", ""),
          jamBuka: t.jamBuka, jamTutup: t.jamTutup, toleransiMenit: t.toleransiMenit,
          isActive: t.isActive, programId: t.programId
        });
      });
    }
  }

  programIds.forEach(programId => {
    const isTaqwimDate = jadwalConfig.taqwim?.tanggalList?.some((t:any) => t.programId === programId && t.tanggal.startsWith(tanggal));
    if (isTaqwimDate) {
      const taqwimConf = jadwalConfig.taqwim?.configs?.find((c:any) => c.programId === programId && c.isActive);
      if (taqwimConf) {
        const s1Idx = finalJadwal.findIndex(j => j.sesi === "SESI_1" && j.programId === programId);
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
  });


  for (const jadwal of finalJadwal) {
    if (!jadwal.isActive) continue;
    const [bukaH, bukaM] = jadwal.jamBuka.split(':').map(Number);
    const [tutupH, tutupM] = jadwal.jamTutup.split(':').map(Number);
    const bukaVal = bukaH * 60 + bukaM;
    const baseTutup = tutupH * 60 + tutupM;
    const tutupVal = baseTutup + (jadwal.toleransiMenit || 0);
    const isCrossMidnight = baseTutup < bukaVal || tutupVal >= 1440;

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

  const uniqueActiveSesis = Array.from(new Set(activeSesis));
  uniqueActiveSesis.sort((a,b) => {
    const na = parseInt(a.replace("SESI_", ""));
    const nb = parseInt(b.replace("SESI_", ""));
    return na - nb;
  });

  return { activeSesis: uniqueActiveSesis, nextSession, isResting: uniqueActiveSesis.length === 0 && !nextSession };
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
  allPengajarSesi = [],
  allPengajarSesiProgram = []
}: {
  programList: any[];
  allowedClassIds?: string[] | null;
  userRole?: string;
  teacherSessions?: { sesi: string; kelasId: string; isProgramLevel?: boolean; programId?: string; programNama?: string }[];
  allPengajarSesi?: { sesi: string; kelasId: string; user: { id: string; nama: string } }[];
  allPengajarSesiProgram?: { sesi: string; programId: string; user: { id: string; nama: string }; program: { id: string; nama_indo: string } }[];
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
  const [kecerdasan, setKecerdasan] = useState<string[]>([]);
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
        const targetKelasIds = isTeacher ? (allowedClassIds || []) : [kelasId].filter(Boolean) as string[];
        const { activeSesis, nextSession, isResting } = computeSessionState(data, programList, targetKelasIds, `${y}-${m}-${d}`, isTeacher);
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

  const activeClassIdRef = useRef(activeClassId);
  useEffect(() => {
    activeClassIdRef.current = activeClassId;
  }, [activeClassId]);

  const [countdown, setCountdown] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);

  // Efek interval untuk auto-switch sesi — TANPA activeSession di dependency
  useEffect(() => {
    if (!isTeacher || !jadwalSesiList || !jadwalSesiList.globalSesi) return;

    const intervalId = setInterval(() => {
      const targetKelasIds = isTeacher ? (allowedClassIds || []) : [kelasId].filter(Boolean) as string[];
      const { activeSesis, nextSession, isResting } = computeSessionState(jadwalSesiList, programList, targetKelasIds, tanggal, isTeacher);
      setActiveSessionsList(activeSesis);
      setNextSessionInfo(nextSession);
      setIsResting(isResting);

      if (nextSession) {
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        });
        const parts = formatter.formatToParts(new Date());
        const h = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
        const m = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
        const s = parseInt(parts.find(p => p.type === 'second')?.value || '0');
        
        const currentSeconds = h * 3600 + m * 60 + s;
        const [bukaH, bukaM] = nextSession.jamBuka.split(':').map(Number);
        let targetSeconds = bukaH * 3600 + bukaM * 60;
        
        if (targetSeconds < currentSeconds) {
           targetSeconds += 24 * 3600;
        }
        
        const diff = targetSeconds - currentSeconds;
        if (diff > 0) {
          setCountdown({ hours: Math.floor(diff / 3600), minutes: Math.floor((diff % 3600) / 60), seconds: diff % 60 });
        } else {
          setCountdown(null);
        }
      } else {
        setCountdown(null);
      }

      const prevSession = activeSessionRef.current;
      const prevClassId = activeClassIdRef.current;

      const activeAssignments = teacherSessions.filter(ts => activeSesis.includes(ts.sesi));

      let nextSesi: string | null = null;
      let nextKelasId: string | null = null;

      if (activeSesis.length > 0) {
        if (prevSession && activeSesis.includes(prevSession)) {
          const teachesPrev = teacherSessions.some(ts => ts.sesi === prevSession);
          if (teachesPrev) {
            const currentAssignmentIdx = activeAssignments.findIndex(a => a.sesi === prevSession && a.kelasId === prevClassId);
            
            if (currentAssignmentIdx !== -1) {
              if (isCompletedRef.current && activeAssignments.length > 1) {
                const nextAssign = currentAssignmentIdx + 1 < activeAssignments.length ? activeAssignments[currentAssignmentIdx + 1] : activeAssignments[currentAssignmentIdx];
                nextSesi = nextAssign.sesi;
                nextKelasId = nextAssign.kelasId;
              } else {
                nextSesi = prevSession;
                nextKelasId = prevClassId;
              }
            } else {
              nextSesi = prevSession;
              nextKelasId = prevClassId;
            }
          } else {
            if (activeAssignments.length > 0) {
              nextSesi = activeAssignments[0].sesi;
              nextKelasId = activeAssignments[0].kelasId;
            } else {
              const idx = activeSesis.indexOf(prevSession);
              nextSesi = idx + 1 < activeSesis.length ? activeSesis[idx + 1] : prevSession;
              nextKelasId = null;
            }
          }
        } else {
          if (activeAssignments.length > 0) {
            nextSesi = activeAssignments[0].sesi;
            nextKelasId = activeAssignments[0].kelasId;
          } else {
            nextSesi = activeSesis[0];
            nextKelasId = null;
          }
        }
      }

      if (prevSession !== nextSesi || prevClassId !== nextKelasId) {
        if (nextSesi) {
          setActiveSession(nextSesi);
          setSesi(nextSesi as SesiKelas);
          setIsBadalMode(false);
          setIsSaved(false);

          if (nextKelasId) {
             setKelasId(nextKelasId);
             setActiveClassId(nextKelasId);
          } else {
             const fallback = teacherSessions.find(ts => ts.sesi === nextSesi);
             if (fallback) {
               setKelasId(fallback.kelasId);
               setActiveClassId(fallback.kelasId);
             } else {
               setKelasId("");
               setActiveClassId(null);
             }
          }
          toast("Sesi berganti otomatis", { icon: '🔄' });
        } else {
          setActiveSession(null);
          setSesi("" as SesiKelas);
          toast("Sesi saat ini telah berakhir", { icon: '🔒' });
        }
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isTeacher, jadwalSesiList, teacherSessions]); // ← activeSession DIHAPUS dari deps

  // Interval countdown untuk mode Admin (non-teacher) — teacher sudah punya interval di atas
  useEffect(() => {
    if (isTeacher || !jadwalSesiList || !jadwalSesiList.globalSesi) return;
    const intervalId = setInterval(() => {
      const targetKelasIds = [kelasId].filter(Boolean) as string[];
      const { nextSession } = computeSessionState(jadwalSesiList, programList, targetKelasIds, tanggal);
      if (nextSession) {
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        });
        const parts = formatter.formatToParts(new Date());
        const h = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
        const m = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
        const s = parseInt(parts.find(p => p.type === 'second')?.value || '0');
        const currentSeconds = h * 3600 + m * 60 + s;
        const [bukaH, bukaM] = nextSession.jamBuka.split(':').map(Number);
        let targetSeconds = bukaH * 3600 + bukaM * 60;
        if (targetSeconds < currentSeconds) targetSeconds += 24 * 3600;
        const diff = targetSeconds - currentSeconds;
        if (diff > 0) {
          setCountdown({ hours: Math.floor(diff / 3600), minutes: Math.floor((diff % 3600) / 60), seconds: diff % 60 });
        } else {
          setCountdown(null);
        }
      } else {
        setCountdown(null);
      }
    }, 1000);
    return () => clearInterval(intervalId);
  }, [isTeacher, jadwalSesiList, kelasId, tanggal]);

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
    // KECUALI jika sedang dalam mode Badal (kelasId valid dari modal badal)
    if (isTeacher && allowedClassIds && allowedClassIds.length === 0 && !isBadalMode) {
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
          setKecerdasan(data.absenPengajarData.kecerdasan ? data.absenPengajarData.kecerdasan.split(", ") : []);
          setIsSaved(true); // Data sudah tersimpan di server
        } else {
          // Coba muat dari cache localStorage
          const cached = loadFormCache(tanggal, sesi, kelasId);
          if (cached) {
            setMateri(cached.materi || "");
            setWaktuMulai(cached.waktuMulai || "");
            setWaktuSelesai(cached.waktuSelesai || "");
            setAtribut(cached.atribut || { kopiah: false, nametag: false, bros: false });
            setKecerdasan(cached.kecerdasan || []);
          } else {
            setMateri("");
            setWaktuMulai("");
            setWaktuSelesai("");
            setAtribut({ kopiah: false, nametag: false, bros: false });
            setKecerdasan([]);
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
  }, [tanggal, sesi, kelasId, isTeacher, hasCheckedSession, isBadalMode]);

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
          kecerdasan: kecerdasan.length > 0 ? kecerdasan.join(", ") : null,
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
    const addedIds = new Set<string>(); // Mencegah duplikat key

    const pushOption = (opt: { id: string; label: string; group: string }) => {
      if (!addedIds.has(opt.id)) {
        addedIds.add(opt.id);
        list.push(opt);
      }
    };

    // Jika tidak dibatasi, boleh pilih "Semua Santri"
    if (!allowedClassIds) {
      pushOption({ id: "ALL", label: "Semua Santri", group: "" });
    }

    programList.forEach((program) => {
      // Cek apakah guru ini punya penugasan level program untuk program ini
      const isProgramLevelAllowed = teacherSessions.some(ts => ts.isProgramLevel && ts.programId === program.id);
      
      if (isProgramLevelAllowed || !allowedClassIds) {
        pushOption({ id: `PROGRAM_${program.id}`, label: `Seluruh Program ${program.nama_indo}`, group: "Program Level" });
      }

      if (program.kelasList.length > 0) {
        program.kelasList.forEach((k: any) => {
          // Jika dibatasi, hanya masukkan kelas yang diperbolehkan
          if (!allowedClassIds || allowedClassIds.includes(k.id)) {
            pushOption({ id: k.id, label: k.nama, group: program.nama_indo });
          }
        });
      } else {
        // Program tanpa kelas (jika tidak dibatasi dan belum masuk di atas)
        if (!allowedClassIds && !isProgramLevelAllowed) {
          pushOption({ id: `PROGRAM_${program.id}`, label: program.nama_indo, group: "Program" });
        }
      }
    });

    if (!allowedClassIds) {
      pushOption({ id: "UNASSIGNED", label: "Belum Ditempatkan", group: "" });
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

  const groupedSantri = useMemo(() => {
    const groups: Record<string, SantriAbsenTarget[]> = {};
    santriList.forEach(s => {
      const key = s.kelasNama ?? s.programNama ?? "Tanpa Kelas";
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });
    return groups;
  }, [santriList]);

  const handleCopyLaporan = (className: string, students: SantriAbsenTarget[]) => {
    let text = `Kelas: ${className}\n\n`;
    students.forEach((s, idx) => {
      text += `${idx + 1}. ${s.nama}\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      toast.success(`Daftar santri kelas ${className} berhasil disalin`, { icon: '📋' });
    }).catch(() => {
      toast.error("Gagal menyalin teks");
    });
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
              {/* Countdown ke sesi berikutnya saat sesi aktif */}
              {activeSession && nextSessionInfo && countdown && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)] w-24">Berikutnya</span>
                  <span className="text-sm font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    {nextSessionInfo.label} pukul {nextSessionInfo.jamBuka}
                    <span className="ml-1 font-black text-amber-600 tabular-nums">
                      {String(countdown.hours).padStart(2, '0')}:{String(countdown.minutes).padStart(2, '0')}:{String(countdown.seconds).padStart(2, '0')}
                    </span>
                    lagi
                  </span>
                </div>
              )}
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
                      if (!j && pId && jadwalSesiList.sesiTambahan) j = jadwalSesiList.sesiTambahan.find((x: any) => x.sesi === activeSession && x.programId === pId);
                      if (!j) j = jadwalSesiList.globalSesi?.find((x: any) => x.sesi === activeSession);
                      
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
                  {/* Sesi global (semua sesi yang ada di JadwalSesi, termasuk Sesi 7+) */}
                  {jadwalSesiList?.globalSesi?.map((gs: any) => (
                    <option key={gs.sesi} value={gs.sesi}>
                      {gs.label || `Sesi ${gs.sesi.replace('SESI_', '')}`}
                    </option>
                  )) ?? (
                    // Fallback hardcode Sesi 1-6 jika jadwalSesiList belum tersedia
                    <>
                      <option value="SESI_1">Sesi 1</option>
                      <option value="SESI_2">Sesi 2</option>
                      <option value="SESI_3">Sesi 3</option>
                      <option value="SESI_4">Sesi 4</option>
                      <option value="SESI_5">Sesi 5</option>
                      <option value="SESI_6">Sesi 6</option>
                    </>
                  )}
                  {/* Sesi tambahan program yang tidak ada di global (ditampilkan per-program agar tidak bingung) */}
                  {jadwalSesiList?.sesiTambahan?.filter((s: any) => {
                    // Tampilkan sesi tambahan yang sesinya tidak ada di globalSesi
                    const existsInGlobal = jadwalSesiList?.globalSesi?.some((gs: any) => gs.sesi === s.sesi);
                    if (existsInGlobal) return false;
                    // Filter berdasarkan program yang aktif di kelasId yang dipilih
                    let pId = null;
                    if (kelasId && kelasId !== "ALL" && kelasId !== "UNASSIGNED") {
                      if (kelasId.startsWith("PROGRAM_")) pId = kelasId.replace("PROGRAM_", "");
                      else {
                        const prog = programList.find(p => p.kelasList.some((k: any) => k.id === kelasId));
                        if (prog) pId = prog.id;
                      }
                    }
                    return !pId || s.programId === pId;
                  }).map((s: any) => {
                    // Cari nama program dari programList untuk ditampilkan di label
                    const progNama = programList.find(p => p.id === s.programId)?.nama_indo ?? s.programId;
                    return (
                      <option key={`${s.sesi}_${s.programId}`} value={s.sesi}>
                        Sesi {s.sesi.replace('SESI_', '')} — {progNama}
                      </option>
                    );
                  })}
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
                <div className="inline-flex items-center gap-3 px-6 py-3 bg-amber-50 rounded-2xl text-sm font-bold text-amber-700 border border-amber-200 shadow-sm">
                  <span className="relative flex h-3 w-3 flex-shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                  </span>
                  {countdown !== null ? (
                    <span className="flex items-center gap-2">
                      Dimulai dalam
                      <span className="inline-flex items-center gap-1 bg-white border border-amber-300 rounded-xl px-3 py-1 font-black text-amber-700 tabular-nums text-base shadow-sm">
                        <Clock className="w-4 h-4 text-amber-500" />
                        {String(countdown.hours).padStart(2, '0')}:{String(countdown.minutes).padStart(2, '0')}:{String(countdown.seconds).padStart(2, '0')}
                      </span>
                    </span>
                  ) : (
                    "Sistem akan otomatis berpindah..."
                  )}
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

            <div className="flex flex-col">
              {isLoading ? (
                <div className="p-8 text-center text-sm font-semibold text-[var(--color-text-muted)]">Memuat data santri...</div>
              ) : santriList.length === 0 ? (
                <div className="p-8 text-center text-[var(--color-text-muted)] font-medium">Tidak ada santri yang ditemukan pada filter ini.</div>
              ) : (
                <>
                  {/* Badges Kelas */}
                  {Object.keys(groupedSantri).length > 1 && (
                    <div className="flex flex-wrap gap-3 px-6 py-4 bg-white border-b border-[var(--color-surface-dark)]">
                      {Object.entries(groupedSantri).map(([className, students]) => (
                        <button
                          key={className}
                          onClick={() => {
                            const el = document.getElementById(`kelas-group-${className}`);
                            if (el) {
                              const y = el.getBoundingClientRect().top + window.scrollY - 100;
                              window.scrollTo({ top: y, behavior: 'smooth' });
                            }
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-surface)] hover:bg-[var(--color-surface-dark)] border border-[var(--color-surface-dark)] rounded-full text-sm font-bold text-[var(--color-text)] transition-colors shadow-sm"
                        >
                          {className}
                          <span className="bg-[var(--color-primary-50)] text-[var(--color-primary)] px-2 py-0.5 rounded-md text-xs border border-[var(--color-primary-100)]">
                            {students.length} Santri
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Grouped Tables */}
                  <div className="flex flex-col">
                    {Object.entries(groupedSantri).map(([className, students]) => (
                      <div key={className} id={`kelas-group-${className}`} className="border-b border-[var(--color-surface-dark)] last:border-0 scroll-mt-24">
                        {/* Header Kelas */}
                        <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--color-surface-light)]">
                          <h3 className="text-lg font-bold text-[var(--color-text)] flex items-center gap-3">
                            <span className="w-1.5 h-6 bg-[var(--color-primary)] rounded-full"></span>
                            {className}
                            <span className="text-sm font-semibold text-[var(--color-text-muted)]">({students.length})</span>
                          </h3>
                          <button
                            onClick={() => handleCopyLaporan(className, students)}
                            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-[var(--color-surface)] border border-[var(--color-surface-dark)] rounded-xl text-xs font-bold text-[var(--color-text)] transition-colors shadow-sm"
                          >
                            <Copy className="w-4 h-4 text-[var(--color-primary)]" />
                            Copy Daftar Nama
                          </button>
                        </div>
                        
                        {/* Table */}
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-[var(--color-surface-dark)] text-left">
                            <thead className="bg-white text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)] border-y border-[var(--color-surface-dark)]">
                              <tr>
                                <th className="px-4 py-4 text-center w-16">#</th>
                                <th className="px-6 py-4">Santri</th>
                                <th className="px-6 py-4 min-w-[300px]">Status Kehadiran</th>
                                <th className="px-6 py-4">Keterangan</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-surface)] text-sm text-[var(--color-text-muted)] bg-white">
                              {students.map((santri, index) => {
                                const currentStatus = absenMap[santri.riwayatId]?.status;
                                const currentKet = absenMap[santri.riwayatId]?.keterangan || "";

                                return (
                                  <tr key={santri.riwayatId} className="hover:bg-[var(--color-surface-light)] transition-colors">
                                    <td className="px-4 py-4 text-center font-bold text-[var(--color-text-subtle)]">{index + 1}</td>
                                    <td className="px-6 py-4">
                                      <p className="font-bold text-[var(--color-text)]">{santri.nama}</p>
                                      <div className="mt-1 flex flex-wrap items-center gap-2">
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
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {(
              (isTeacher && activeSession && (teacherSessions.some(ts => ts.sesi === activeSession && ts.kelasId === kelasId) || isBadalMode)) ||
              (userRole === "ADMIN" && showAdminPengajarForm)
            ) && (
                <div ref={adminFormRef} className="p-6 md:p-8 bg-[var(--color-surface-light)] border-t border-[var(--color-surface-dark)]">
                  {/* Peringatan jika admin belum memilih kelas spesifik */}
                  {userRole === "ADMIN" && (kelasId === "ALL" || kelasId === "UNASSIGNED") && (
                    <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <span className="text-amber-500 text-lg">⚠️</span>
                      <p className="text-sm font-medium text-amber-800">
                        Pilih <strong>kelas atau program spesifik</strong> di filter atas agar data absen pengajar bisa tersimpan. Data absen santri tetap tersimpan meski filter "Semua Santri" aktif.
                      </p>
                    </div>
                  )}
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
                            // Tentukan programId dari kelasId yang aktif
                            let activeProgramId: string | null = null;
                            if (kelasId && kelasId !== "ALL" && kelasId !== "UNASSIGNED") {
                              if (kelasId.startsWith("PROGRAM_")) {
                                activeProgramId = kelasId.replace("PROGRAM_", "");
                              } else {
                                const prog = programList.find(p => p.kelasList.some((k: any) => k.id === kelasId));
                                if (prog) activeProgramId = prog.id;
                              }
                            }

                            // Pengajar kelas reguler terjadwal di sesi+kelas ini
                            const matchedRegular = allPengajarSesi
                              .filter(ps => ps.sesi === sesi && ps.kelasId === kelasId)
                              .map(ps => ps.user);

                            // Pengajar level program terjadwal di sesi+program ini
                            const matchedProgram = allPengajarSesiProgram
                              .filter(psp => psp.sesi === sesi && activeProgramId && psp.programId === activeProgramId)
                              .map(psp => psp.user);

                            // Gabungkan yang terjadwal (tanpa duplikat)
                            const matchedIds = new Set([...matchedRegular, ...matchedProgram].map(u => u.id));
                            const matchedTeachers = [...matchedRegular, ...matchedProgram.filter(u => !matchedRegular.some(r => r.id === u.id))];

                            // Semua pengajar unik (untuk optgroup "Pengajar Lain")
                            const allUsersMap = new Map<string, { id: string; nama: string }>();
                            allPengajarSesi.forEach(ps => { if (!allUsersMap.has(ps.user.id)) allUsersMap.set(ps.user.id, ps.user); });
                            allPengajarSesiProgram.forEach(psp => { if (!allUsersMap.has(psp.user.id)) allUsersMap.set(psp.user.id, psp.user); });

                            const otherTeachers = Array.from(allUsersMap.values())
                              .filter(u => !matchedIds.has(u.id))
                              .sort((a, b) => a.nama.localeCompare(b.nama));

                            const currentKelasLabel = allClassesOptions.find(c => c.id === kelasId)?.label ?? kelasId;
                            const currentSesiLabel = sesi ? sesi.replace('SESI_', 'Sesi ') : "";

                            return (
                              <>
                                {matchedTeachers.length > 0 && (
                                  <optgroup label={`Terjadwal di ${currentSesiLabel} | ${currentKelasLabel}`}>
                                    {matchedTeachers.map(u => (
                                      <option key={`matched-${u.id}`} value={u.id}>{u.nama}</option>
                                    ))}
                                  </optgroup>
                                )}
                                {otherTeachers.length > 0 && (
                                  <optgroup label="Pengajar Lain (Sebagai Pengganti)">
                                    {otherTeachers.map(u => (
                                      <option key={`other-${u.id}`} value={u.id}>{u.nama}</option>
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
                        <label className="block text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-text-muted)] mb-3">Basic Kecerdasan (Bisa Pilih Lebih Dari Satu)</label>
                        <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                           {[
                              { id: "Verbal-Linguistic", label: "Verbal-Linguistic Intelligence (الذَّكَاءُ اللُّغَوِيُّ)" },
                              { id: "Logical-Mathematical", label: "Logical-Mathematical Intelligence (الذَّكَاءُ الْمَنْطِقِيُّ الرِّيَاضِيُّ)" },
                              { id: "Visual-Spatial", label: "Visual-Spatial Intelligence (الذَّكَاءُ الْبَصَرِيُّ الْمَكَانِيُّ)" },
                              { id: "Musical-Rhythmic", label: "Musical-Rhythmic Intelligence (الذَّكَاءُ الْمُوسِيقِيُّ)" },
                              { id: "Bodily-Kinesthetic", label: "Bodily-Kinesthetic Intelligence (الذَّكَاءُ الْجَسَدِيُّ الْحَرَكِيُّ)" },
                              { id: "Interpersonal", label: "Interpersonal Intelligence (الذَّكَاءُ الاِجْتِمَاعِيُّ)" },
                              { id: "Intrapersonal", label: "Intrapersonal Intelligence (الذَّكَاءُ الذَّاتِيُّ)" },
                              { id: "Naturalistic", label: "Naturalistic Intelligence (الذَّكَاءُ الطَّبِيعِيُّ)" },
                              { id: "Existential", label: "Existential Intelligence (الذَّكَاءُ الْوُجُودِيُّ)" }
                           ].map(item => (
                              <label key={item.id} className="flex items-center justify-between cursor-pointer bg-white px-4 py-2.5 rounded-xl border border-[var(--color-surface-dark)] hover:border-[var(--color-primary-100)] transition-colors shadow-sm">
                                 <span className="text-sm font-semibold text-[var(--color-text)]">{item.label}</span>
                                 <input
                                    type="checkbox"
                                    checked={kecerdasan.includes(item.id)}
                                    onChange={(e) => {
                                       if (e.target.checked) {
                                          setKecerdasan([...kecerdasan, item.id]);
                                       } else {
                                          setKecerdasan(kecerdasan.filter(k => k !== item.id));
                                       }
                                       setIsSaved(false);
                                    }}
                                    className="rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)] w-4 h-4 border-[var(--color-surface-dark)]"
                                 />
                              </label>
                           ))}
                        </div>
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
