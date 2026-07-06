import { NextResponse } from 'next/server';
import { destroyTauziSession } from '@/lib/tauzi-auth';

export async function POST() {
  await destroyTauziSession();
  
  // Hapus cookie lain jika perlu
  const response = NextResponse.json({ success: true });
  response.cookies.delete('tauzi-session');
  
  return response;
}
