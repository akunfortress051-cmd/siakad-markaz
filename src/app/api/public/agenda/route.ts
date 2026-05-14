import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Handle preflight requests for CORS
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    
    // Ambil agenda yang akan datang atau yang merupakan rutinan (isBerulang = true)
    const agendas = await prisma.agenda.findMany({
      where: {
        OR: [
          { isBerulang: true },
          { waktuSelesai: { gte: new Date() } }
        ]
      },
      orderBy: { waktuMulai: 'asc' },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: agendas,
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  } catch (error) {
    console.error('Error fetching public agenda:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memuat agenda rutin.' }, 
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }
}
