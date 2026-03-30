import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ACCOUNTS = [
  'mediatortimteng',
  'ofc_markazarabiyahonline',
  'ofc_markazarabiyah'
];

export async function POST() {
  try {
    const rapidApiKey = process.env.RAPIDAPI_KEY;
    const rapidApiHost = process.env.RAPIDAPI_HOST;

    if (!rapidApiKey || !rapidApiHost) {
      return NextResponse.json({ error: 'Missing API keys in .env' }, { status: 500 });
    }

    const options = {
      method: 'GET',
      headers: {
        'x-rapidapi-key': rapidApiKey,
        'x-rapidapi-host': rapidApiHost,
        'Content-Type': 'application/json'
      }
    };

    let syncedCount = 0;

    for (const username of ACCOUNTS) {
      // 1. Dapatkan user_id menggunakan endpoint user_info
      const infoUrl = `https://${rapidApiHost}/user_info?user_name=${username}`;
      const infoRes = await fetch(infoUrl, options);
      
      if (!infoRes.ok) {
        const errText = await infoRes.text();
        console.error(`⚠️ [Sync] Gagal mendapatkan ID untuk ${username}: HTTP ${infoRes.status} - ${errText}`);
        continue;
      }
      
      const infoData = await infoRes.json();
      const userId = infoData?.data?.id;
      
      if (!userId) {
        console.error(`⚠️ [Sync] Gagal mendapatkan ID untuk ${username} (Data tidak valid):`, infoData);
        continue;
      }

      // 2. Tarik daftar Feed (medias_v2)
      // Sengaja dilimit 10 batch_size untuk penghematan ringan
      const mediasUrl = `https://${rapidApiHost}/medias_v2?user_id=${userId}&batch_size=10`;
      const mediasRes = await fetch(mediasUrl, options);
      if (!mediasRes.ok) {
        const errText = await mediasRes.text();
        console.error(`⚠️ [Sync] Gagal mengambil Feed untuk ${username}. HTTP Status: ${mediasRes.status} - ${errText}`);
        continue;
      }

      const mediasData = await mediasRes.json();
      const posts = mediasData?.data?.items || [];
      if (posts.length === 0) {
        console.error(`⚠️ [Sync] Tidak mendapat item satupun untuk ${username}. Response:`, mediasData);
      }

      // 3. Simpan ke Database
      for (const post of posts) {
        if (!post.code) continue;

        const postUrl = `https://www.instagram.com/p/${post.code}/`;
        const judul = post.caption?.text || '';
        
        let thumbnailUrl = null;
        if (post.image_versions2?.candidates?.length > 0) {
            thumbnailUrl = post.image_versions2.candidates[0].url;
        } else if (post.carousel_media?.length > 0 && post.carousel_media[0].image_versions2) {
            thumbnailUrl = post.carousel_media[0].image_versions2.candidates[0].url;
        }

        const exists = await prisma.instagramPost.findFirst({ where: { url: postUrl } });
        if (!exists) {
          await prisma.instagramPost.create({
            data: {
              url: postUrl,
              judul: judul.substring(0, 190), // Truncate limit judul
              thumbnailUrl: thumbnailUrl,
              author: username,
              isActive: true, // Default aktif
            }
          });
          syncedCount++;
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Berhasil sinkronisasi ${syncedCount} post baru secara permanen ke Database.` 
    });
  } catch (error) {
    console.error('Instagram Sync Error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem' }, { status: 500 });
  }
}
