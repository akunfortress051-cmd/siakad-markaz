import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPassword, createSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password harus diisi' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Username atau password salah (atau akun tidak aktif)' }, { status: 401 });
    }

    const isMatch = await verifyPassword(password, user.passwordHash);

    if (!isMatch) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 });
    }

    // Create session
    await createSession({
      userId: user.id,
      username: user.username,
      role: user.role,
      nama: user.nama,
      kelasId: user.kelasId,
      sakan: user.sakan,
    });

    let redirectPath = '/admin/dashboard';
    if (user.role === 'PENGAJAR' || user.role === 'WALI_KELAS') {
      redirectPath = '/admin/absensi/kelas';
    } else if (user.role === 'KSU') {
      redirectPath = '/admin/absensi/sakan';
    }

    return NextResponse.json({
      success: true,
      redirect: redirectPath
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem' }, { status: 500 });
  }
}
