const { getMasterSantriList } = require('./src/lib/santri-api');

async function main() {
    const list = await getMasterSantriList();
    const names = [
        "Abdurrahman Shiddiq",
        "Maulana Abdur Rohman",
        "Muhammad Zaky Mubarok",
        "Nayaka Wicaksana Sanusi"
    ];
    for (const s of list) {
        if (names.includes(s.nama)) {
            console.log(s.nama, "| ID:", s.id, "| Aktif:", s.isAktif, "| Dufah:", s.dufahNama);
        }
    }
}
main().catch(console.error);
