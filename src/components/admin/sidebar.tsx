"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, DoorOpen, GraduationCap, History, Settings, Menu, X, CalendarCheck } from "lucide-react";
import { useState } from "react";

const navigationGroups = [
  {
    title: "Utama",
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ]
  },
  {
    title: "Divisi Absensi",
    items: [
      { href: "/admin/absensi", label: "Data Absensi", icon: CalendarCheck },
    ]
  },
  {
    title: "Divisi Kelas",
    items: [
      { href: "/admin/manajemen-kelas", label: "Alokasi Kelas", icon: Users },
      { href: "/admin/kelas", label: "Manajemen Ruang Kelas", icon: DoorOpen },
    ]
  },
  {
    title: "Divisi Syahadah",
    items: [
      { href: "/admin/syahadah", label: "Data Syahadah", icon: GraduationCap },
      { href: "/admin/riwayat", label: "Riwayat Santri", icon: History },
      { href: "/admin/master-data", label: "Pengaturan Syahadah", icon: Settings },
    ]
  }
];

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

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
          {navigationGroups.map((group) => (
            <div key={group.title}>
              <p className="px-4 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">
                {group.title}
              </p>
              <ul className="space-y-1">
                {group.items.map((item) => {
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
          ))}
        </nav>

        <div className="p-6 border-t border-slate-100">
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
            <p className="text-xs font-bold text-slate-800">Admin Mode</p>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">Kelola semua entitas santri, nilai, kelas, dan proses print syahadah secara terpusat.</p>
          </div>
        </div>
      </aside>
    </>
  );
}
