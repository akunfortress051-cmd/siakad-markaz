import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPassword, createSession } from '@/lib/auth';

// Rate Limiter Sederhana (In-Memory)
// Catatan: Cukup untuk menangkal basic brute-force berulang dari satu IP dalam waktu singkat.
const rateLimitMap = new Map<string, { count: number; expiresAt: number }>();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_TIME_MS = 5 * 60 * 1000; // 5 menit

function recordFailedAttempt(ip: string, now: number) {
  if (ip === "unknown") return;
  const data = rateLimitMap.get(ip);
  if (data) {
    data.count += 1;
    data.expiresAt = now + LOCKOUT_TIME_MS;
    rateLimitMap.set(ip, data);
  } else {
    rateLimitMap.set(ip, { count: 1, expiresAt: now + LOCKOUT_TIME_MS });
  }
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const now = Date.now();

    // Check Rate Limit
    const rateData = rateLimitMap.get(ip);
    if (rateData) {
      if (now > rateData.expiresAt) {
        // Reset jika waktu lockout sudah habis
        rateLimitMap.delete(ip);
      } else if (rateData.count >= MAX_FAILED_ATTEMPTS) {
        const remainingMinutes = Math.ceil((rateData.expiresAt - now) / 60000);
        return NextResponse.json(
          { error: `Terlalu banyak percobaan. Silakan coba lagi dalam ${remainingMinutes} menit.` },
          { status: 429 }
        );
      }
    }

    const { username, password, turnstileToken } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password harus diisi' }, { status: 400 });
    }

    if (!turnstileToken) {
      return NextResponse.json({ error: 'Verifikasi Captcha diperlukan' }, { status: 400 });
    }

    // Validasi token Turnstile
    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
    if (turnstileSecret) {
      const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          secret: turnstileSecret,
          response: turnstileToken,
          remoteip: ip,
        }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        return NextResponse.json({ error: 'Verifikasi Captcha gagal atau kadaluarsa' }, { status: 400 });
      }
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      recordFailedAttempt(ip, now);
      return NextResponse.json({ error: 'Username tidak ditemukan' }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Akun dinonaktifkan. Silakan hubungi admin.' }, { status: 403 });
    }

    const isMatch = await verifyPassword(password, user.passwordHash);

    if (!isMatch) {
      recordFailedAttempt(ip, now);
      return NextResponse.json({ error: 'Password salah' }, { status: 401 });
    }

    // Reset rate limit jika berhasil login
    rateLimitMap.delete(ip);

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
