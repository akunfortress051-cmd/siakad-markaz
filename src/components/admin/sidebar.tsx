"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, DoorOpen, GraduationCap, History, Settings, Menu, X, CalendarCheck, Bed, BookOpen, Activity, BarChart3, Printer, CalendarDays, Instagram, Palette, UserCog, LogOut, ShieldCheck, Calendar } from "lucide-react";
import { useState, useEffect } from "react";

const navigationGroups = [
  {
    title: "Utama",
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, permissionId: "dashboard" },
      { href: "/admin/jadwal-saya", label: "Jadwal Saya", icon: Calendar, requiredRoles: ["PENGAJAR", "WALI_KELAS"] },
    ]
  },
  {
    title: "Divisi Angkatan (Duf'ah)",
    items: [
      { href: "/admin/dufah", label: "Manajemen Angkatan & Usbu'", icon: CalendarCheck, permissionId: "manajemen_dufah" },
    ]
  },
  {
    title: "Divisi Absensi",
    items: [
      { href: "/admin/absensi/sakan", label: "Absen Sakan", icon: Bed, permissionId: "absen_sakan" },
      { href: "/admin/absensi/kelas", label: "Absen Kelas", icon: BookOpen, permissionId: "absen_kelas" },
      { href: "/admin/jadwal-sesi", label: "Jadwal Buka/Tutup Sesi", icon: CalendarCheck, permissionId: "manajemen_sesi" },
      { href: "/admin/absensi/kegiatan", label: "Absen Kegiatan", icon: Activity, permissionId: "absen_kegiatan" },
      { href: "/admin/absensi/rekap/sakan", label: "Rekap Sakan", icon: Bed, permissionId: "rekap_sakan" },
      { href: "/admin/absensi/rekap/kegiatan", label: "Rekap Kegiatan", icon: Activity, permissionId: "rekap_kegiatan" },
      { href: "/admin/absensi/rekap/kelas", label: "Rekap Kelas", icon: BookOpen, permissionId: "rekap_kelas" },
      { href: "/admin/absensi/rekap/pengajar", label: "Rekap Pengajar", icon: UserCog, permissionId: "rekap_pengajar" },
      { href: "/admin/absensi/pengaturan", label: "Pengaturan Kegiatan", icon: Settings, permissionId: "manajemen_dufah" },
    ]
  },
  {
    title: "Divisi Kelas",
    items: [
      { href: "/admin/manajemen-kelas", label: "Alokasi Kelas", icon: Users, permissionId: "manajemen_kelas" },
      { href: "/admin/kelas", label: "Manajemen Ruang Kelas", icon: DoorOpen, permissionId: "manajemen_kelas" },
      { href: "/admin/jadwal-mengajar", label: "Jadwal Mengajar", icon: Calendar, permissionId: "manajemen_kelas" },
    ]
  },
  {
    title: "Divisi Syahadah",
    items: [
      { href: "/admin/syahadah", label: "Data Syahadah", icon: GraduationCap, permissionId: "data_syahadah" },
      { href: "/admin/input-nilai-kelas", label: "Input Nilai", icon: BookOpen, permissionId: "input_nilai" },
      { href: "/admin/cetak-usbu", label: "Cetak Nilai Pekanan", icon: Printer, permissionId: "cetak_nilai_pekanan" },
      { href: "/layout-editor", label: "Layout Syahadah", icon: Palette, permissionId: "layout_syahadah" },
      { href: "/admin/riwayat", label: "Riwayat Santri", icon: History, permissionId: "riwayat_santri" },
      { href: "/admin/master-data", label: "Pengaturan Syahadah", icon: Settings, permissionId: "pengaturan_syahadah" },
    ]
  },
  {
    title: "Manajemen Aplikasi",
    items: [
      { href: "/admin/manajemen-user", label: "Manajemen User", icon: UserCog, requiredRole: "ADMIN", permissionId: "manajemen_user" },
      { href: "/admin/manajemen-role", label: "Hak Akses (Role)", icon: ShieldCheck, requiredRole: "ADMIN", permissionId: "manajemen_user" },
      { href: "/admin/manajemen-konten/agenda", label: "Agenda Rutinan", icon: CalendarDays, permissionId: "manajemen_dufah" },
      { href: "/admin/manajemen-konten/instagram", label: "Konten Instagram", icon: Instagram, permissionId: "manajemen_dufah" },
    ]
  }
];

export function Sidebar({ user, permissions = [] }: { user: any, permissions?: string[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [activeCtx, setActiveCtx] = useState<{ activeDufah: string | null; usbuLabel: string } | null>(null);

  // Kumpulkan semua menu yang diizinkan untuk user ini
  const allowedItems: any[] = [];
  navigationGroups.forEach((group) => {
    group.items.forEach((item: any) => {
      let allowed = true;
      if (item.requiredRole && user?.role !== item.requiredRole) allowed = false;
      if (item.requiredRoles && !item.requiredRoles.includes(user?.role)) allowed = false;
      if (item.permissionId && !permissions.includes("*") && !permissions.includes(item.permissionId)) allowed = false;
      if (allowed) allowedItems.push(item);
    });
  });

  const showMenuInBottomNav = allowedItems.length > 5;
  const bottomNavItems = showMenuInBottomNav ? allowedItems.slice(0, 4) : allowedItems;

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetch("/api/admin/active-context")
      .then((res) => res.json())
      .then((data) => setActiveCtx(data))
      .catch((err) => console.error("Failed to load context", err));
  }, []);

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden flex items-center justify-between bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold">M</div>
          <span className="font-bold text-slate-800 tracking-wide text-sm">Markaz Arabiyah</span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 -mr-2 text-slate-600 hover:text-emerald-700 transition"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Bottom Navigation for Mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)] pb-safe">
        {bottomNavItems.map(item => {
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} onClick={() => setIsOpen(false)} className={`flex flex-col items-center justify-center gap-1 w-16 h-12 rounded-xl transition-colors ${isActive ? "text-emerald-600" : "text-slate-400 hover:text-slate-600"}`}>
              <Icon className={`h-[22px] w-[22px] ${isActive ? "text-emerald-600" : ""}`} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[9px] font-bold text-center leading-tight truncate w-full px-1">{item.label}</span>
            </Link>
          )
        })}
        {showMenuInBottomNav && (
          <button onClick={() => setIsOpen(true)} className={`flex flex-col items-center justify-center gap-1 w-16 h-12 rounded-xl transition-colors ${isOpen ? "text-emerald-600" : "text-slate-400 hover:text-slate-600"}`}>
            <Menu className="h-[22px] w-[22px]" strokeWidth={isOpen ? 2.5 : 2} />
            <span className="text-[9px] font-bold text-center leading-tight">Lainnya</span>
          </button>
        )}
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 overflow-y-auto flex flex-col ${isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="hidden lg:flex flex-col p-6 border-b border-slate-100 items-center justify-center bg-emerald-50/50">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 shadow-md text-white font-black text-xl mb-3">
            M
          </div>
          <h1 className="text-center text-[15px] font-black tracking-wide text-slate-900 leading-tight">
            Sistem Akademik<br />
            <span className="text-emerald-700 font-bold text-sm tracking-normal">Markaz Arabiyah</span>
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-8 mt-4 lg:mt-0">
          {/* Active Context Information */}
          {activeCtx && activeCtx.activeDufah && (
            <div className="px-2 mb-2 lg:mt-0 mt-2">
              <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/50 px-3 py-2 text-[11px] font-bold text-emerald-700 shadow-sm">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 animate-pulse" />
                Aktif: {activeCtx.activeDufah} • {activeCtx.usbuLabel}
              </div>
            </div>
          )}

          {navigationGroups.map((group) => {
            const filteredItems = group.items.filter((item: any) => {
              if (item.requiredRole && user?.role !== item.requiredRole) return false;
              if (item.requiredRoles && !item.requiredRoles.includes(user?.role)) return false;

              // Filter permission
              if (item.permissionId && !permissions.includes("*") && !permissions.includes(item.permissionId)) {
                return false;
              }

              return true;
            });

            if (filteredItems.length === 0) return null;

            return (
              <div key={group.title}>
                <p className="px-4 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">
                  {group.title}
                </p>
                <ul className="space-y-1">
                  {filteredItems.map((item) => {
                    const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                    const Icon = item.icon;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          className={`group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${isActive
                            ? "bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-100"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            }`}
                        >
                          <Icon className={`h-5 w-5 transition-colors ${isActive ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-600"}`} />
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className="p-6 border-t border-slate-100">
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
            <p className="text-sm font-bold text-slate-800">{user?.nama}</p>
            <p className="text-xs text-slate-500 mt-1 mb-3">{user?.role}</p>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold py-2 px-3 rounded-xl transition-colors text-sm"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
