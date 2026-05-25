async function main() {
  const res = await fetch("https://ppdb-markaz.vercel.app/api/santri");
  const json = await res.json();
  const dataArray = Array.isArray(json) ? json : json.data;
  
  if (!dataArray || dataArray.length === 0) {
    console.log("Kosong");
    return;
  }
  
  const sample = dataArray[0];
  console.log("Contoh data dari API PPDB:");
  console.log("Keys:", Object.keys(sample));
  console.log("Apakah ada NIS?", sample.nis ? sample.nis : "Tidak ada");
  console.log(sample);
}
main();
