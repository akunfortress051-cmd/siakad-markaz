const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const ids = [
        "5904af82-eee2-45f3-be25-01654c62c1aa",
        "dc6bc687-8338-4514-a476-29f089b7677e",
        "9c82a82c-92e4-4eb6-85f6-ed7f140734c9",
        "3458da8e-4036-46fc-9400-1e435ba4da7f"
    ];
    
    const santris = await prisma.santriInternal.findMany({
        where: { id: { in: ids } },
        include: {
            riwayatRecords: {
                include: { kelas: true }
            }
        }
    });

    for (const s of santris) {
        console.log(`Santri: ${s.nama} (ID: ${s.id})`);
        for (const r of s.riwayatRecords) {
            console.log(` - Dufah: ${r.dufahNama}, Kelas: ${r.kelas?.nama || 'NULL'}`);
        }
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
