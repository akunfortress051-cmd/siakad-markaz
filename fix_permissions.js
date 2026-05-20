const fs = require('fs');
const path = require('path');

const mappings = {
  '/home/ibnualwan/ijazah-sample/src/app/admin/dashboard/page.tsx': 'dashboard',
  '/home/ibnualwan/ijazah-sample/src/app/admin/dufah/page.tsx': 'manajemen_dufah',
  '/home/ibnualwan/ijazah-sample/src/app/admin/absensi/sakan/page.tsx': 'absen_sakan',
  '/home/ibnualwan/ijazah-sample/src/app/admin/absensi/kegiatan/page.tsx': 'absen_kegiatan',
  '/home/ibnualwan/ijazah-sample/src/app/admin/absensi/pengaturan/page.tsx': 'manajemen_dufah',
  '/home/ibnualwan/ijazah-sample/src/app/admin/absensi/rekap/sakan/page.tsx': 'rekap_sakan',
  '/home/ibnualwan/ijazah-sample/src/app/admin/absensi/rekap/kegiatan/page.tsx': 'rekap_kegiatan',
  '/home/ibnualwan/ijazah-sample/src/app/admin/absensi/rekap/pengajar/page.tsx': 'rekap_pengajar',
  '/home/ibnualwan/ijazah-sample/src/app/admin/absensi/rekap/kelas/page.tsx': 'rekap_kelas',
  '/home/ibnualwan/ijazah-sample/src/app/admin/kelas/page.tsx': 'manajemen_kelas',
  '/home/ibnualwan/ijazah-sample/src/app/admin/manajemen-kelas/page.tsx': 'manajemen_kelas',
  '/home/ibnualwan/ijazah-sample/src/app/admin/jadwal-mengajar/page.tsx': 'manajemen_kelas',
  '/home/ibnualwan/ijazah-sample/src/app/admin/manajemen-konten/instagram/page.tsx': 'manajemen_dufah',
  '/home/ibnualwan/ijazah-sample/src/app/admin/manajemen-konten/agenda/page.tsx': 'manajemen_dufah',
  '/home/ibnualwan/ijazah-sample/src/app/admin/input-nilai/[id]/page.tsx': 'input_nilai',
  '/home/ibnualwan/ijazah-sample/src/app/admin/cetak-usbu/bulk/[usbu]/page.tsx': 'syahadah',
  '/home/ibnualwan/ijazah-sample/src/app/admin/cetak-usbu/[kelasId]/[usbu]/page.tsx': 'syahadah'
};

for (const [file, perm] of Object.entries(mappings)) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    if (!content.includes('requirePermission')) {
      // Add import
      if (content.includes('import ')) {
        const firstImportIdx = content.indexOf('import ');
        content = content.slice(0, firstImportIdx) + `import { requirePermission } from "@/lib/permission";\n` + content.slice(firstImportIdx);
      } else {
        content = `import { requirePermission } from "@/lib/permission";\n` + content;
      }
      
      // Add await requirePermission
      const funcRegex = /export default async function\s+\w+\s*\([^)]*\)\s*\{/;
      const match = content.match(funcRegex);
      if (match) {
        const insertIdx = match.index + match[0].length;
        content = content.slice(0, insertIdx) + `\n  await requirePermission("${perm}");` + content.slice(insertIdx);
        fs.writeFileSync(file, content, 'utf8');
        console.log("Updated", file, "with", perm);
      } else {
        console.log("Could not find function signature in", file);
      }
    }
  } else {
    console.log("File not found", file);
  }
}
