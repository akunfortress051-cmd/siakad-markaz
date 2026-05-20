fetch('https://ppdb-markaz.vercel.app/api/santri').then(r=>r.json()).then(d=>console.log(d[0]));
