const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const names = [
        "Abdurrahman Shiddiq",
        "Maulana Abdur Rohman",
        "Muhammad Zaky Mubarok",
        "Nayaka Wicaksana Sanusi"
    ];
    
    const riwayats = await prisma.riwayatSantri.findMany({
        where: {
            santri: {
                nama: { in: names }
            },
            dufahNama: "Duf'ah 89"
        },
        include: {
            santri: true,
            kelas: true,
            absenKelasList: {
                take: 1
            }
        }
    });

    console.dir(riwayats, { depth: null });
}
main().catch(console.error).finally(() => prisma.$disconnect());
