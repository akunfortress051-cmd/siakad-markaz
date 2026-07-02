import { NextResponse } from 'next/server';
import { destroySantriSession } from '@/lib/santri-auth';

export async function POST() {
  await destroySantriSession();
  return NextResponse.json({ success: true });
}
