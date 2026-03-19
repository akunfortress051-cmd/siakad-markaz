import Link from "next/link";

const navigationItems = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/manajemen-kelas", label: "Manajemen Kelas" },
  { href: "/admin/riwayat", label: "Riwayat Santri" },
  { href: "/admin/master-data", label: "Master Data" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-700">
              Markaz Arabiyah
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">
              Sistem Manajemen Nilai dan Cetak Ijazah
            </h1>
          </div>
          <nav className="flex flex-wrap gap-3">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-white hover:text-emerald-700"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">{children}</main>
    </div>
  );
}
