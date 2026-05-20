async function main() {
  const url = "http://localhost:3000/api/admin/absensi/kelas?tanggal=2026-05-19&sesi=SESI_2&kelasId=cmp2zypjc006qc3rz01dlm38v";
  const res = await fetch(url);
  const data = await res.json();
  console.log("SantriList length:", data.santriList ? data.santriList.length : "undefined");
  if (data.santriList && data.santriList.length === 0) {
      console.log("SANTRI LIST EMPTY FROM API!");
  } else if (data.santriList) {
      console.log("First santri:", data.santriList[0]);
  }
}
main();
