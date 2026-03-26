import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // API ini HANYA me-read dari Database Lokal (0 RapidAPI Limit)
    const posts = await prisma.instagramPost.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }, // Terlama ke terbaru (Opsional bisa 'desc')
      take: 30 // Batasi 30 post terakhir untuk mempercepat waktu loding mobile
    });

    return NextResponse.json({ 
      success: true, 
      data: posts 
    });
  } catch (error) {
    console.error('Error fetching instagram feed from database:', error);
    return NextResponse.json({ error: 'Gagal memuat feed.' }, { status: 500 });
  }
}
