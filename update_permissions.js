const fs = require('fs');
const path = require('path');

const replacements = [
  {
    file: 'src/components/admin/sidebar.tsx',
    replaces: [
      { from: 'permissionId: "syahadah" },', to: 'permissionId: "data_syahadah" },' }, // Only the first one which is Data Syahadah
      { from: 'label: "Cetak Nilai Pekanan", icon: Printer, permissionId: "syahadah"', to: 'label: "Cetak Nilai Pekanan", icon: Printer, permissionId: "cetak_nilai_pekanan"' },
      { from: 'label: "Layout Syahadah", icon: Palette, permissionId: "syahadah"', to: 'label: "Layout Syahadah", icon: Palette, permissionId: "layout_syahadah"' },
      { from: 'label: "Riwayat Santri", icon: History, permissionId: "syahadah"', to: 'label: "Riwayat Santri", icon: History, permissionId: "riwayat_santri"' },
      { from: 'label: "Pengaturan Syahadah", icon: Settings, permissionId: "syahadah"', to: 'label: "Pengaturan Syahadah", icon: Settings, permissionId: "pengaturan_syahadah"' },
    ]
  },
  {
    file: 'src/app/admin/syahadah/page.tsx',
    replaces: [{ from: 'requirePermission("syahadah")', to: 'requirePermission("data_syahadah")' }]
  },
  {
    file: 'src/app/admin/cetak-usbu/page.tsx',
    replaces: [{ from: 'requirePermission("syahadah")', to: 'requirePermission("cetak_nilai_pekanan")' }]
  },
  {
    file: 'src/app/admin/cetak-usbu/[kelasId]/[usbu]/page.tsx',
    replaces: [{ from: 'requirePermission("syahadah")', to: 'requirePermission("cetak_nilai_pekanan")' }]
  },
  {
    file: 'src/app/admin/cetak-usbu/bulk/[usbu]/page.tsx',
    replaces: [{ from: 'requirePermission("syahadah")', to: 'requirePermission("cetak_nilai_pekanan")' }]
  },
  {
    file: 'src/app/layout-editor/page.tsx',
    replaces: [{ from: 'requirePermission("syahadah")', to: 'requirePermission("layout_syahadah")' }]
  },
  {
    file: 'src/app/layout-editor/[programId]/page.tsx',
    replaces: [{ from: 'requirePermission("syahadah")', to: 'requirePermission("layout_syahadah")' }]
  },
  {
    file: 'src/app/admin/riwayat/page.tsx',
    replaces: [{ from: 'requirePermission("syahadah")', to: 'requirePermission("riwayat_santri")' }]
  },
  {
    file: 'src/app/admin/master-data/page.tsx',
    replaces: [{ from: 'requirePermission("syahadah")', to: 'requirePermission("pengaturan_syahadah")' }]
  }
];

for (const rep of replacements) {
  const filePath = path.join('/home/ibnualwan/ijazah-sample', rep.file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    for (const r of rep.replaces) {
      content = content.replace(r.from, r.to);
    }
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${rep.file}`);
  } else {
    console.log(`File not found: ${rep.file}`);
  }
}
