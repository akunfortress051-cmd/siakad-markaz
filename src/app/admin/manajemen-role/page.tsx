"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, Save, Loader2, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

type RolePermission = {
  id: string;
  role: string;
  permission: string;
};

const AVAILABLE_PERMISSIONS = [
  { id: "dashboard", label: "Dashboard Admin", desc: "Akses ke halaman dashboard utama admin" },
  { id: "absen_sakan", label: "Absen Sakan", desc: "Akses untuk absen kehadiran di asrama" },
  { id: "absen_kelas", label: "Absen Kelas", desc: "Akses untuk absen kehadiran santri di kelas" },
  { id: "absen_kegiatan", label: "Absen Kegiatan", desc: "Akses untuk absen kegiatan santri" },
  { id: "absen_pengajar", label: "Absen Pengajar", desc: "Akses untuk absen diri sendiri (pengajar/guru)" },
  { id: "input_nilai", label: "Input Nilai", desc: "Akses untuk input nilai akademik" },
  { id: "rekap_sakan", label: "Rekap Sakan", desc: "Akses untuk melihat rekap kehadiran sakan" },
  { id: "rekap_kelas", label: "Rekap Kelas", desc: "Akses untuk melihat rekap kehadiran kelas" },
  { id: "rekap_kegiatan", label: "Rekap Kegiatan", desc: "Akses untuk melihat rekap kegiatan" },
  { id: "rekap_pengajar", label: "Rekap Pengajar", desc: "Akses untuk melihat laporan absen pengajar" },
  { id: "manajemen_kelas", label: "Manajemen Kelas", desc: "Akses untuk atur plotting kelas" },
  { id: "manajemen_dufah", label: "Manajemen Duf'ah", desc: "Akses untuk tambah/edit angkatan" },
  { id: "manajemen_user", label: "Manajemen User & Role", desc: "Akses khusus Super Admin (tidak disarankan untuk KSU/Pengajar)" },
  { id: "syahadah", label: "Manajemen Syahadah", desc: "Akses untuk fitur sertifikat & printout" },
];

export default function ManajemenRolePage() {
  const [roles, setRoles] = useState<string[]>([]);
  const [permissionsMap, setPermissionsMap] = useState<Record<string, Set<string>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeRole, setActiveRole] = useState("KSU");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Custom Role input
  const [newRoleName, setNewRoleName] = useState("");
  const [isAddingRole, setIsAddingRole] = useState(false);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/roles");
      if (!res.ok) throw new Error("Gagal mengambil data");
      const { roles: apiRoles, permissions }: { roles: string[], permissions: RolePermission[] } = await res.json();
      
      setRoles(apiRoles);
      
      const newMap: Record<string, Set<string>> = {};
      // Inisialisasi set kosong untuk tiap role
      apiRoles.forEach(r => {
        newMap[r] = new Set();
      });
      // Admin otomatis dapat semua permission
      if (newMap["ADMIN"]) {
        AVAILABLE_PERMISSIONS.forEach(p => newMap["ADMIN"].add(p.id));
      }
      
      permissions.forEach(p => {
        if (newMap[p.role]) {
          newMap[p.role].add(p.permission);
        }
      });
      
      setPermissionsMap(newMap);
      if (apiRoles.length > 0 && !apiRoles.includes(activeRole)) {
        setActiveRole(apiRoles[0]);
      }
    } catch (error) {
      toast.error("Gagal mengambil permissions");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (permId: string) => {
    setPermissionsMap(prev => {
      const newMap = { ...prev };
      const roleSet = new Set(newMap[activeRole]);
      if (roleSet.has(permId)) {
        roleSet.delete(permId);
      } else {
        roleSet.add(permId);
      }
      newMap[activeRole] = roleSet;
      return newMap;
    });
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: activeRole,
          permissions: Array.from(permissionsMap[activeRole] || [])
        })
      });
      
      if (!res.ok) throw new Error("Gagal menyimpan");
      toast.success(`Permission ${activeRole} berhasil disimpan`);
    } catch (error) {
      toast.error("Gagal menyimpan perubahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddRole = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedRole = newRoleName.trim().toUpperCase().replace(/\s+/g, "_");
    if (!formattedRole) return;
    
    if (roles.includes(formattedRole)) {
      toast.error("Role sudah terdaftar");
      return;
    }
    
    setRoles(prev => [...prev, formattedRole]);
    setPermissionsMap(prev => ({
      ...prev,
      [formattedRole]: new Set()
    }));
    setActiveRole(formattedRole);
    setNewRoleName("");
    setIsAddingRole(false);
    toast.success(`Role ${formattedRole} berhasil ditambahkan ke daftar. Jangan lupa klik Simpan setelah memberi permission.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-emerald-600" />
            Manajemen Role & Permission
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Atur modul apa saja yang bisa diakses oleh masing-masing Role pengguna (Dinamis).
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row min-h-[500px]">
        {/* Sidebar Roles */}
        <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 p-4 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pilih Role</p>
            <button 
              onClick={() => setIsAddingRole(!isAddingRole)}
              className="text-xs flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-bold"
            >
              <Plus size={14} /> Baru
            </button>
          </div>

          {isAddingRole && (
            <form onSubmit={handleAddRole} className="mb-4 bg-white p-3 rounded-xl border border-slate-200 space-y-2">
              <input
                type="text"
                required
                placeholder="NAMA_ROLE"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs uppercase"
              />
              <div className="flex justify-end gap-2 text-xs">
                <button 
                  type="button" 
                  onClick={() => setIsAddingRole(false)} 
                  className="px-2 py-1 text-slate-500 font-semibold"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="px-2 py-1 bg-emerald-600 text-white rounded font-semibold hover:bg-emerald-700"
                >
                  Tambah
                </button>
              </div>
            </form>
          )}

          <div className="flex flex-row md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0 flex-1">
            {roles.map(role => (
              <button
                key={role}
                onClick={() => setActiveRole(role)}
                className={`text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all flex-shrink-0 ${
                  activeRole === role 
                    ? "bg-emerald-100 text-emerald-700 shadow-sm border border-emerald-200" 
                    : "text-slate-600 hover:bg-slate-200/50"
                }`}
              >
                {role.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Permissions Content */}
        <div className="flex-1 p-6 relative">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    Hak Akses: {activeRole.replace("_", " ")}
                  </h2>
                  <p className="text-sm text-slate-500">Centang modul yang diizinkan untuk diakses.</p>
                </div>
                <button
                  onClick={handleSave}
                  disabled={isSubmitting || activeRole === "ADMIN"}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={18} />}
                  Simpan Perubahan
                </button>
              </div>

              {activeRole === "ADMIN" && (
                <div className="bg-amber-50 text-amber-700 p-4 rounded-xl text-sm border border-amber-200 mb-6">
                  <strong>Peringatan:</strong> Role ADMIN secara otomatis memiliki semua akses. Anda tidak perlu mengatur permission untuk role ini.
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {AVAILABLE_PERMISSIONS.map(perm => (
                  <label 
                    key={perm.id} 
                    className={`flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
                      permissionsMap[activeRole]?.has(perm.id) 
                        ? "bg-emerald-50 border-emerald-200 shadow-sm" 
                        : "bg-white border-slate-200 hover:border-slate-300"
                    } ${activeRole === "ADMIN" ? "opacity-70 pointer-events-none cursor-not-allowed" : ""}`}
                  >
                    <div className="pt-0.5">
                      <input
                        type="checkbox"
                        checked={permissionsMap[activeRole]?.has(perm.id) || false}
                        onChange={() => handleToggle(perm.id)}
                        disabled={activeRole === "ADMIN"}
                        className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${permissionsMap[activeRole]?.has(perm.id) ? "text-emerald-800" : "text-slate-700"}`}>
                        {perm.label}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {perm.desc}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
