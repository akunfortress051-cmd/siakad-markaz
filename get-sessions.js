const fetch = require('node-fetch');

async function getSessions() {
  const res = await fetch('https://wa-multi-session.amtsilatipusat.com/api/v1/sessions', {
    headers: {
      'X-API-Key': '024a3190-cfd8-4da6-8e82-7ac0f6c568d0'
    }
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

getSessions().catch(console.error);
