import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const rs = await prisma.riwayatSantri.findMany({
    where: { santri: { nama: { contains: "Akmal Ali", mode: "insensitive" } } },
    include: { santri: true, program: true, nilaiList: true }
  })
  for (const r of rs) {
     console.log(`- ${r.santri.nama} | Prog: ${r.program?.nama_indo} | Dufah: ${r.dufahNama} | Status: ${r.status_kelulusan} | Nilais: ${r.nilaiList.length} | ID: ${r.id}`)
  }
}
main().catch(console.error).then(() => prisma.$disconnect());
