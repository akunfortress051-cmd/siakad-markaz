import { Metadata } from "next";
import Link from "next/link";
import { Bed, BookOpen, Activity, Settings, LayoutDashboard } from "lucide-react";

export const metadata: Metadata = {
  title: "Menu Absensi - Admin Panel",
};

const menus = [
  {
    title: "Absen Sakan",
    description: "Pendataan kehadiran santri di asrama (1x sehari).",
    href: "/admin/absensi/sakan",
    icon: Bed,
    color: "bg-blue-100 text-blue-700",
  },
  {
    title: "Absen Kelas",
    description: "Pendataan kehadiran santri di kelas berdasarkan hissoh.",
    href: "/admin/absensi/kelas",
    icon: BookOpen,
    color: "bg-emerald-100 text-emerald-700",
  },
  {
    title: "Absen Kegiatan",
    description: "Pendataan kehadiran untuk kegiatan dinamis seperti Halaqoh, Tahajud.",
    href: "/admin/absensi/kegiatan",
    icon: Activity,
    color: "bg-amber-100 text-amber-700",
  },
  {
    title: "Pengaturan Kegiatan",
    description: "Tambahkan atau edit header kategori kegiatan dinamis.",
    href: "/admin/absensi/pengaturan",
    icon: Settings,
    color: "bg-slate-100 text-slate-700",
  },
];

export default function AbsensiDashboardPage() {
  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black text-slate-900 md:text-4xl">
          Divisi Absen
        </h1>
        <p className="text-base text-slate-500 max-w-2xl">
          Kelola seluruh pendataan absensi santri mulai dari sakan, kelas, hingga kegiatan harian terpadu.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
        {menus.map((menu) => {
          const Icon = menu.icon;
          return (
            <Link
              key={menu.href}
              href={menu.href}
              className="group relative flex flex-col justify-between overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-md sm:p-8"
            >
              <div className="flex items-start justify-between">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${menu.color} transition-transform group-hover:scale-110`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-8">
                <h3 className="text-xl font-bold text-slate-900">{menu.title}</h3>
                <p className="mt-2 text-sm font-medium text-slate-500 leading-relaxed">
                  {menu.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
