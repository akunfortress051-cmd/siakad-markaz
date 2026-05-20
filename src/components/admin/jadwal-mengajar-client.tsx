"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { User, X, Box, Save, Plus, Check, AlertTriangle } from "lucide-react";

type Teacher = {
  id: string;
  nama: string;
  role: string;
};

type Program = {
  id: string;
  nama_indo: string;
  kelasList: { id: string; nama: string }[];
};

type PengajarSesi = {
  id: string;
  kelasId: string;
  sesi: string;
  userId: string;
  user: {
    id: string;
    nama: string;
    role: string;
  };
};

export function JadwalMengajarClient({
  programs,
  initialPengajarSesi,
  teachers
}: {
  programs: Program[];
  initialPengajarSesi: PengajarSesi[];
  teachers: Teacher[];
}) {
  const [dataSesi, setDataSesi] = useState<PengajarSesi[]>(initialPengajarSesi);
  const [selectedSlot, setSelectedSlot] = useState<{
    kelasId: string;
    kelasNama: string;
    sesi: string;
    currentUserId: string | null;
  } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  
  // State for search inside modal
  const [searchQuery, setSearchQuery] = useState("");

  const SESI_LIST = ["SESI_1", "SESI_2", "SESI_3", "SESI_4", "SESI_5", "SESI_6"];

  const getPengajarForSlot = (kelasId: string, sesi: string) => {
    return dataSesi.find(d => d.kelasId === kelasId && d.sesi === sesi);
  };

  const handleOpenModal = (kelasId: string, kelasNama: string, sesi: string) => {
    const existing = getPengajarForSlot(kelasId, sesi);
    setSelectedSlot({ kelasId, kelasNama, sesi, currentUserId: existing?.userId || null });
    setSelectedTeacherId(existing?.userId || "");
    setSearchQuery("");
    setModalOpen(true);
  };

  const handleSaveSlot = async () => {
    if (!selectedSlot) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/jadwal-mengajar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kelasId: selectedSlot.kelasId,
          sesi: selectedSlot.sesi,
          userId: selectedTeacherId || null
        })
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Jadwal berhasil diperbarui");
        
        let newData = dataSesi.filter(
          d => !(d.kelasId === selectedSlot.kelasId && d.sesi === selectedSlot.sesi)
        );
        
        if (selectedTeacherId) {
          // Remove if this teacher teaches another class in the same session
          newData = newData.filter(
            d => !(d.userId === selectedTeacherId && d.sesi === selectedSlot.sesi)
          );
          
          const teacherObj = teachers.find(t => t.id === selectedTeacherId);
          if (teacherObj) {
            newData.push({
              id: Math.random().toString(), // temp id
              kelasId: selectedSlot.kelasId,
              userId: selectedTeacherId,
              sesi: selectedSlot.sesi,
              user: teacherObj
            });
          }
        }
        setDataSesi(newData);
        setModalOpen(false);
      } else {
        toast.error(result.error || "Gagal menyimpan");
      }
    } catch (e) {
      toast.error("Terjadi kesalahan sistem");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredTeachers = teachers.filter(t => 
    t.nama.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const clashingAssignment = (selectedTeacherId && selectedSlot) 
    ? dataSesi.find(d => d.userId === selectedTeacherId && d.sesi === selectedSlot.sesi && d.kelasId !== selectedSlot.kelasId)
    : null;
    
  // Find name of clashing class
  let clashingClassName = "Kelas Lain";
  if (clashingAssignment) {
    for (const p of programs) {
      const k = p.kelasList.find(x => x.id === clashingAssignment.kelasId);
      if (k) {
        clashingClassName = k.nama;
        break;
      }
    }
  }

  return (
    <div className="space-y-8 pb-10">
      {programs.map(program => (
        <div key={program.id} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4">
            <h2 className="text-xl font-black text-white">{program.nama_indo}</h2>
          </div>
          
          <div className="p-6 space-y-6 bg-slate-50">
            {program.kelasList.length === 0 ? (
              <p className="text-center text-slate-500 py-4">Belum ada kelas di program ini.</p>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {program.kelasList.map(kelas => (
                  <div key={kelas.id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden hover:shadow-md transition-shadow duration-300">
                    <div className="bg-slate-50/80 px-5 py-3 border-b border-slate-100 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Box className="w-4 h-4 text-emerald-600" />
                        <h3 className="font-bold text-slate-800">{kelas.nama}</h3>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4">
                      {SESI_LIST.map(sesi => {
                        const pengajar = getPengajarForSlot(kelas.id, sesi);
                        return (
                          <div 
                            key={sesi} 
                            onClick={() => handleOpenModal(kelas.id, kelas.nama, sesi)}
                            className="relative flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-100 bg-slate-50/50 cursor-pointer hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-sm transition-all duration-200 group"
                          >
                            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1.5 group-hover:text-emerald-500 transition-colors">
                              {sesi.replace('_', ' ')}
                            </div>
                            {pengajar ? (
                              <div className="flex flex-col items-center justify-center">
                                <div className="font-bold text-sm text-slate-700 text-center line-clamp-2 leading-tight">
                                  {pengajar.user.nama}
                                </div>
                                {pengajar.user.role === "WALI_KELAS" && (
                                  <div className="text-[9px] font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded mt-1 uppercase tracking-wider">
                                    Wali Kelas
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1 text-xs font-semibold text-slate-400 border border-dashed border-slate-300 px-3 py-1 rounded-lg group-hover:border-emerald-400 group-hover:text-emerald-600 group-hover:bg-emerald-100/50 transition-colors">
                                <Plus className="w-3 h-3" /> Plot
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Modal Plotting */}
      {modalOpen && selectedSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-[2rem] bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Plot Pengajar</h3>
                <p className="text-xs font-semibold text-emerald-600 mt-0.5">
                  {selectedSlot.kelasNama} — {selectedSlot.sesi.replace('_', ' ')}
                </p>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6">
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                Pilih Pengajar / Wali Kelas
              </label>
              
              <input
                type="text"
                placeholder="Cari nama pengajar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 mb-4"
              />
              
              {clashingAssignment && (
                <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-3 items-start animate-in slide-in-from-top-2 duration-300">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-800">
                    <p className="font-bold text-sm">Peringatan Bentrok Jadwal!</p>
                    <p className="mt-1 leading-relaxed">Pengajar ini sudah terjadwal di <strong>{clashingClassName}</strong> pada sesi yang sama. Jika Anda simpan, jadwal di kelas lama akan otomatis <strong>dihapus</strong>.</p>
                  </div>
                </div>
              )}

              <div className="max-h-[35vh] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                <div 
                  onClick={() => setSelectedTeacherId("")}
                  className={`flex cursor-pointer items-center justify-between rounded-2xl border p-3 transition ${
                    selectedTeacherId === ""
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-slate-200 hover:border-emerald-300 hover:bg-slate-50"
                  }`}
                >
                  <span className="text-sm font-semibold text-slate-700">Kosongkan Jadwal</span>
                  {selectedTeacherId === "" && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
                      <Save className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>

                {filteredTeachers.map(t => (
                  <div 
                    key={t.id}
                    onClick={() => setSelectedTeacherId(t.id)}
                    className={`flex cursor-pointer items-center justify-between rounded-2xl border p-3 transition ${
                      selectedTeacherId === t.id
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-slate-200 hover:border-emerald-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200">
                        <User className="h-4 w-4 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{t.nama}</p>
                        <p className="text-[10px] font-semibold text-slate-500">{t.role}</p>
                      </div>
                    </div>
                    {selectedTeacherId === t.id && (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                ))}
                
                {filteredTeachers.length === 0 && (
                  <p className="text-center text-sm text-slate-500 py-4">Tidak ada pengajar yang cocok.</p>
                )}
              </div>

              <div className="mt-6">
                <button
                  onClick={handleSaveSlot}
                  disabled={isSaving}
                  className="w-full rounded-2xl bg-emerald-600 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
