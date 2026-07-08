"use client";

import { useState } from "react";
import { UserCog, Plus, Trash2, ShieldAlert } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

export function CheckoutConfigClient({ initialConfigs, allUsers }: { initialConfigs: any[], allUsers: any[] }) {
  const [configs, setConfigs] = useState(initialConfigs);
  const [activeTab, setActiveTab] = useState("REGULER");
  
  const [showForm, setShowForm] = useState(false);
  const [newTipe, setNewTipe] = useState("USER"); // "USER", "WALI_KELAS", "DHOBIT_SAKAN"
  const [newUserId, setNewUserId] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newUrutan, setNewUrutan] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const router = useRouter();

  const filteredConfigs = configs.filter(c => c.kategori === activeTab);

  async function handleDelete(id: string) {
    if (!confirm("Yakin ingin menghapus approver ini?")) return;
    
    try {
      const res = await fetch(`/api/admin/checkout/config?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Approver dihapus");
        setConfigs(configs.filter(c => c.id !== id));
        router.refresh();
      } else {
        toast.error("Gagal menghapus");
      }
    } catch (e) {
      toast.error("Error jaringan");
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newLabel || (newTipe === "USER" && !newUserId)) {
      toast.error("Form tidak lengkap"); return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/checkout/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kategori: activeTab,
          tipe: newTipe,
          userId: newTipe === "USER" ? newUserId : null,
          label: newLabel,
          urutan: newUrutan
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Approver ditambahkan");
        const user = allUsers.find(u => u.id === newUserId);
        setConfigs([...configs, { ...data.data, user: user ? { nama: user.nama, username: user.username } : null }]);
        setShowForm(false);
        setNewUserId("");
        setNewLabel("");
        setNewUrutan(0);
        setNewTipe("USER");
        router.refresh();
      } else {
        toast.error(data.error || "Gagal menyimpan");
      }
    } catch (e) {
      toast.error("Error jaringan");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[var(--color-primary-50)] text-[var(--color-primary)] rounded-xl border border-[var(--color-primary-100)]">
            <UserCog size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-[var(--color-text)]">Konfigurasi Approver</h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
              Atur siapa saja pihak yang menyetujui check out santri.
            </p>
          </div>
        </div>
      </div>

      <div className="neu-card-white overflow-hidden">
        <div className="flex gap-4 p-4 border-b border-[var(--color-surface-dark)]">
          <button 
            className={`px-4 py-2 font-bold text-sm rounded-lg transition ${activeTab === 'REGULER' ? 'bg-[var(--color-primary)] text-white' : 'bg-transparent text-[var(--color-text-subtle)] hover:bg-[var(--color-surface)]'}`}
            onClick={() => setActiveTab('REGULER')}
          >
            Kategori Regulér
          </button>
          <button 
            className={`px-4 py-2 font-bold text-sm rounded-lg transition ${activeTab === 'TURATS' ? 'bg-[var(--color-primary)] text-white' : 'bg-transparent text-[var(--color-text-subtle)] hover:bg-[var(--color-surface)]'}`}
            onClick={() => setActiveTab('TURATS')}
          >
            Kategori Turats
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-lg text-[var(--color-text)]">Daftar Pihak Penyetuju ({activeTab})</h2>
            <button 
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-xl text-sm font-bold transition"
            >
              <Plus size={16} /> Tambah Approver
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleAdd} className="mb-6 p-5 border border-dashed border-[var(--color-surface-dark)] rounded-2xl bg-[var(--color-secondary)]">
              <h3 className="text-sm font-bold mb-3 text-[var(--color-text-muted)]">Tambah Approver Baru</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--color-text-subtle)] mb-1">Tipe Approver</label>
                  <select 
                    value={newTipe} 
                    onChange={e => setNewTipe(e.target.value)}
                    className="neu-input w-full rounded-xl text-sm p-2.5"
                    required
                  >
                    <option value="USER">Spesifik User</option>
                    <option value="WALI_KELAS">Dinamis: Sesuai Wali Kelas</option>
                    <option value="DHOBIT_SAKAN">Dinamis: Sesuai Dhobit Sakan</option>
                  </select>
                </div>
                {newTipe === "USER" && (
                  <div>
                    <label className="block text-xs font-bold text-[var(--color-text-subtle)] mb-1">Pilih User</label>
                    <select 
                      value={newUserId} 
                      onChange={e => setNewUserId(e.target.value)}
                      className="neu-input w-full rounded-xl text-sm p-2.5"
                      required
                    >
                      <option value="">Pilih User...</option>
                      {allUsers.map((u: any) => (
                        <option key={u.id} value={u.id}>{u.nama} ({u.role})</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className={newTipe !== "USER" ? "lg:col-span-2" : ""}>
                  <label className="block text-xs font-bold text-[var(--color-text-subtle)] mb-1">Label Jabatan (Contoh: "Wali Kelas")</label>
                  <input 
                    type="text" 
                    value={newLabel} 
                    onChange={e => setNewLabel(e.target.value)}
                    className="neu-input w-full rounded-xl text-sm p-2.5"
                    placeholder="Wali Kelas"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--color-text-subtle)] mb-1">Urutan (Untuk Display)</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="number" 
                      value={newUrutan} 
                      onChange={e => setNewUrutan(parseInt(e.target.value))}
                      className="neu-input w-24 rounded-xl text-sm p-2.5"
                    />
                    <button 
                      type="submit" 
                      disabled={submitting}
                      className="bg-[var(--color-primary)] text-white font-bold text-sm px-4 py-2.5 rounded-xl transition"
                    >
                      Simpan
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}

          {filteredConfigs.length === 0 ? (
            <div className="text-center py-10 bg-white border border-[var(--color-surface-dark)] rounded-2xl">
              <ShieldAlert size={48} className="mx-auto text-[var(--color-warning)] mb-3 opacity-50" />
              <p className="font-bold text-[var(--color-text-muted)]">Belum ada approver yang diatur</p>
              <p className="text-sm text-[var(--color-text-subtle)] mt-1">Check out santri tidak akan bisa dilakukan sebelum ada pihak penyetuju yang ditentukan.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredConfigs.sort((a,b) => a.urutan - b.urutan).map(c => (
                <div key={c.id} className="flex justify-between items-center bg-white p-4 rounded-2xl border border-[var(--color-surface-dark)] shadow-sm hover:border-[var(--color-primary-100)] transition">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 flex items-center justify-center bg-[var(--color-primary-50)] text-[var(--color-primary)] rounded-full font-black text-xs">
                      #{c.urutan}
                    </div>
                    <div>
                      <p className="font-black text-[var(--color-text)]">{c.label}</p>
                      <p className="text-sm text-[var(--color-text-muted)]">
                        {c.tipe === "USER" ? c.user?.nama : c.tipe === "WALI_KELAS" ? "[Dinamis] Wali Kelas Santri" : "[Dinamis] Dhobit Asrama Santri"}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(c.id)}
                    className="p-2 text-[var(--color-danger)] hover:bg-[var(--color-danger-light)] rounded-xl transition"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
