"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";

type Dufah = {
  nama: string;
  usbu1StartDate: string | null;
  usbu1EndDate: string | null;
  usbu2StartDate: string | null;
  usbu2EndDate: string | null;
  usbu3StartDate: string | null;
  usbu3EndDate: string | null;
};

// Inline function to get today WIB as YYYY-MM-DD
function getWibDateString(offsetDays = 0): string {
  const wib = new Date(new Date().getTime() + 7 * 60 * 60 * 1000);
  wib.setDate(wib.getDate() + offsetDays);
  return wib.toISOString().split("T")[0];
}

function getFirstDayOfMonth(): string {
  const wib = new Date(new Date().getTime() + 7 * 60 * 60 * 1000);
  return `${wib.getFullYear()}-${String(wib.getMonth() + 1).padStart(2, "0")}-01`;
}

export function RekapFilterClient({ type, title, useUsbu }: { type: string, title: string, useUsbu: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL state
  const urlDari = searchParams.get("dari") || "";
  const urlSampai = searchParams.get("sampai") || "";

  // Local state
  const [dari, setDari] = useState(urlDari || getFirstDayOfMonth());
  const [sampai, setSampai] = useState(urlSampai || getWibDateString());
  
  // Usbu state
  const [dufahList, setDufahList] = useState<Dufah[]>([]);
  const [selectedDufah, setSelectedDufah] = useState<string>("");
  const [selectedUsbu, setSelectedUsbu] = useState<string>("1");
  const [activeCtxLoaded, setActiveCtxLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    if (!activeCtxLoaded) {
      Promise.all([
        fetch("/api/admin/dufah").then(r => r.json()),
        fetch("/api/admin/active-context").then(r => r.json())
      ]).then(([dufahData, ctxData]) => {
        if (!isMounted) return;
        
        setDufahList(dufahData);
        const activeDufahName = ctxData.activeDufah || (dufahData.length > 0 ? dufahData[0].nama : "");
        const activeUsbuVal = ctxData.activeUsbu ? String(ctxData.activeUsbu) : "1";
        
        setSelectedDufah(activeDufahName);
        setSelectedUsbu(activeUsbuVal);
        setActiveCtxLoaded(true);

        if (!urlDari || !urlSampai) {
          const dufah = dufahData.find((d: any) => d.nama === activeDufahName);
          if (dufah) {
            let dStart = null;
            let dEnd = null;

            if (useUsbu) {
              if (activeUsbuVal === "1") { dStart = dufah.usbu1StartDate; dEnd = dufah.usbu1EndDate; }
              else if (activeUsbuVal === "2") { dStart = dufah.usbu2StartDate; dEnd = dufah.usbu2EndDate; }
              else if (activeUsbuVal === "3") { dStart = dufah.usbu3StartDate; dEnd = dufah.usbu3EndDate; }
              else { dStart = dufah.usbu1StartDate; dEnd = dufah.usbu1EndDate; }
            } else {
              // Untuk Sakan & Kegiatan, ambil satu periode full program
              dStart = dufah.usbu1StartDate;
              dEnd = dufah.usbu3EndDate || dufah.usbu2EndDate || dufah.usbu1EndDate;
            }

            if (dStart && dEnd) {
              const tDari = dStart.split("T")[0];
              const tSampai = dEnd.split("T")[0];
              setDari(tDari);
              setSampai(tSampai);
              
              const params = new URLSearchParams(searchParams.toString());
              params.set("type", type);
              params.set("title", title);
              params.set("dari", tDari);
              params.set("sampai", tSampai);
              router.replace(`?${params.toString()}`);
            }
          }
        }
      });
    }

    return () => { isMounted = false; };
  }, [useUsbu, urlDari, urlSampai, activeCtxLoaded, type, title, router, searchParams]);

  // Handle Apply Date Filter
  const handleApplyDate = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("type", type);
    params.set("title", title);
    params.set("dari", dari);
    params.set("sampai", sampai);
    router.push(`?${params.toString()}`);
  };

  // Handle Apply Usbu Filter
  const handleApplyUsbu = () => {
    const dufah = dufahList.find(d => d.nama === selectedDufah);
    if (!dufah) return;

    let dStart = null;
    let dEnd = null;

    if (selectedUsbu === "ALL") {
      dStart = dufah.usbu1StartDate;
      dEnd = dufah.usbu3EndDate || dufah.usbu2EndDate || dufah.usbu1EndDate;
    } else if (selectedUsbu === "1") {
      dStart = dufah.usbu1StartDate;
      dEnd = dufah.usbu1EndDate;
    } else if (selectedUsbu === "2") {
      dStart = dufah.usbu2StartDate;
      dEnd = dufah.usbu2EndDate;
    } else if (selectedUsbu === "3") {
      dStart = dufah.usbu3StartDate;
      dEnd = dufah.usbu3EndDate;
    }

    if (!dStart || !dEnd) {
      alert("Tanggal Usbu' belum diatur untuk angkatan ini.");
      return;
    }

    const tDari = dStart.split("T")[0];
    const tSampai = dEnd.split("T")[0];
    
    setDari(tDari);
    setSampai(tSampai);

    const params = new URLSearchParams(searchParams.toString());
    params.set("type", type);
    params.set("title", title);
    params.set("dari", tDari);
    params.set("sampai", tSampai);
    router.push(`?${params.toString()}`);
  };

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm mb-6">
      <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
        Filter {useUsbu ? "Berdasarkan Usbu'" : "Rentang Tanggal"}
      </h2>
      
      {useUsbu ? (
        <div className="flex flex-wrap items-end gap-4">
          {!activeCtxLoaded ? (
            <div className="text-sm text-slate-400 font-semibold py-2">Memuat filter...</div>
          ) : (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-500">Duf'ah (Angkatan)</label>
                <select
                  value={selectedDufah}
                  onChange={(e) => setSelectedDufah(e.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-violet-500 min-w-[200px]"
                >
                  {dufahList.map(d => (
                    <option key={d.nama} value={d.nama}>{d.nama}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-500">Usbu' (Pekan)</label>
                <select
                  value={selectedUsbu}
                  onChange={(e) => setSelectedUsbu(e.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-violet-500"
                >
                  <option value="ALL">Semua Usbu' (Satu Program)</option>
                  <option value="1">Usbu' 1</option>
                  <option value="2">Usbu' 2</option>
                  <option value="3">Nihai (Ujian Akhir)</option>
                </select>
              </div>
              <button
                onClick={handleApplyUsbu}
                className="rounded-2xl bg-violet-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700 h-[42px]"
              >
                Terapkan Filter
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-500">Dari</label>
            <input
              type="date"
              value={dari}
              onChange={(e) => setDari(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-violet-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-500">Sampai</label>
            <input
              type="date"
              value={sampai}
              onChange={(e) => setSampai(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-violet-500"
            />
          </div>
          <button
            onClick={handleApplyDate}
            className="rounded-2xl bg-violet-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700 h-[42px]"
          >
            Terapkan Filter
          </button>
        </div>
      )}
    </section>
  );
}
