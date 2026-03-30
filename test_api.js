const options = {
    method: 'GET',
    headers: {
    'x-rapidapi-key': '766babd5d1mshb9011c21da497ffp122354jsn61c98263363c',
    'x-rapidapi-host': 'instagram-scraper2.p.rapidapi.com',
    'Content-Type': 'application/json'
    }
};

const users = ['mediatortimteng', 'cristiano', 'zuck', 'selenagomez'];

(async () => {
    for (const u of users) {
        const res = await fetch(`https://instagram-scraper2.p.rapidapi.com/user_info?user_name=${u}`, options);
        console.log(`\nUser: ${u}`);
        console.log(`Status: ${res.status}`);
        console.log(`Text: ${await res.text()}`);
    }
})();
