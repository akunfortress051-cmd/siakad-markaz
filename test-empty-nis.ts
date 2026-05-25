async function main() {
  const res = await fetch("https://ppdb-markaz.vercel.app/api/santri");
  const json = await res.json();
  const dataArray = Array.isArray(json) ? json : json.data;
  
  if (!dataArray || dataArray.length === 0) {
    console.log("Kosong");
    return;
  }
  
  const aktif = dataArray.filter((s: any) => s.isAktif);
  const tanpaNis = aktif.filter((s: any) => !s.nis || s.nis.trim() === "");
  
  console.log(`Total Santri Aktif: ${aktif.length}`);
  console.log(`Yang BELUM punya NIS: ${tanpaNis.length}`);
  
  if (tanpaNis.length > 0) {
    console.log("\nContoh santri tanpa NIS:");
    tanpaNis.slice(0, 5).forEach((s: any) => console.log(`- ${s.nama} (ID: ${s.id})`));
  }
}
main();
