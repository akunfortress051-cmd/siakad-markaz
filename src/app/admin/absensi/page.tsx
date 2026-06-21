import { Metadata } from "next";
import Link from "next/link";
import { Bed, BookOpen, Activity, Settings, BarChart3, FileText, ClipboardList } from "lucide-react";

export const dynamic = "force-dynamic";

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
    accent: "group-hover:border-blue-200",
  },
  {
    title: "Absen Kelas",
    description: "Pendataan kehadiran santri di kelas berdasarkan hissoh.",
    href: "/admin/absensi/kelas",
    icon: BookOpen,
    color: "bg-[var(--color-primary-100)] text-[var(--color-primary)]",
    accent: "group-hover:border-[var(--color-primary-100)]",
  },
  {
    title: "Absen Kegiatan",
    description: "Pendataan kehadiran untuk kegiatan dinamis seperti Halaqoh, Tahajud.",
    href: "/admin/absensi/kegiatan",
    icon: Activity,
    color: "bg-amber-100 text-amber-700",
    accent: "group-hover:border-amber-200",
  },
  {
    title: "Rekapitulasi Absen",
    description: "Laporan global rekap kehadiran santri dikelompokkan per jenis absensi.",
    href: "/admin/absensi/rekap",
    icon: BarChart3,
    color: "bg-violet-100 text-violet-700",
    accent: "group-hover:border-violet-200",
  },
  {
    title: "Pengaturan Kegiatan",
    description: "Tambahkan atau edit header kategori kegiatan dinamis.",
    href: "/admin/absensi/pengaturan",
    icon: Settings,
    color: "bg-[var(--color-surface)] text-[var(--color-text)]",
    accent: "group-hover:border-slate-300",
  },
  {
    title: "Perizinan Santri",
    description: "Pembuatan tasrih (surat izin) harian, berhari-hari, dan keluar Pare.",
    href: "/admin/absensi/perizinan",
    icon: FileText,
    color: "bg-teal-100 text-teal-700",
    accent: "group-hover:border-teal-200",
  },
  {
    title: "Data Santri Izin",
    description: "Monitoring status santri yang sedang izin dan konfirmasi kehadiran.",
    href: "/admin/absensi/perizinan/data",
    icon: ClipboardList,
    color: "bg-orange-100 text-orange-700",
    accent: "group-hover:border-orange-200",
  },
];

export default function AbsensiDashboardPage() {
  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black md:text-4xl ">
          Divisi Absen
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] max-w-2xl">
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
              className={`group relative flex flex-col justify-between overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--color-surface-dark)] bg-white p-6 shadow-sm transition hover:-translate-y-1 ${menu.accent} hover:shadow-md sm:p-8`}
            >
              <div className="flex items-start justify-between">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${menu.color} transition-transform group-hover:scale-110`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-8">
                <h3 className="text-xl font-bold text-[var(--color-text)]">{menu.title}</h3>
                <p className="mt-2 text-sm font-medium text-[var(--color-text-muted)] leading-relaxed">
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
