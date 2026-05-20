import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseWibDateString, getActiveRiwayatListForAbsen } from "@/lib/absensi";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tanggal = searchParams.get("tanggal");
  const sesi = searchParams.get("sesi");
  const kelasId = searchParams.get("kelasId") || "ALL";

  if (!tanggal || !sesi) {
    return NextResponse.json({ error: "Tanggal dan Sesi harus diisi" }, { status: 400 });
  }

  const parsedDate = parseWibDateString(tanggal);
  const santriList = await getActiveRiwayatListForAbsen(kelasId);
  const santriIds = santriList.map((s) => s.riwayatId);

  const existingAbsen = await prisma.absenKelas.findMany({
    where: {
      tanggal: parsedDate,
      sesi: sesi as any,
      riwayatId: { in: santriIds },
    },
  });

  const userSession = (await getSession()) as any;
  let absenPengajarData = null;
  if (userSession && (userSession.role === "PENGAJAR" || userSession.role === "WALI_KELAS")) {
     absenPengajarData = await prisma.absenPengajar.findUnique({
       where: {
         userId_tanggal_sesi: {
           userId: userSession.userId,
           tanggal: parsedDate,
           sesi: sesi as any
         }
       }
     });
  }

  return NextResponse.json({
    santriList,
    absenData: existingAbsen,
    absenPengajarData,
  });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { tanggal, sesi, kelasId, absenList, absenPengajar } = payload as any;

    if (!tanggal || !sesi || !absenList || !Array.isArray(absenList)) {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }

    const parsedDate = parseWibDateString(tanggal);
    const userSession = (await getSession()) as any;

    const operations: any[] = absenList.map((absen) =>
      prisma.absenKelas.upsert({
        where: {
          riwayatId_tanggal_sesi: {
            riwayatId: absen.riwayatId,
            tanggal: parsedDate,
            sesi: sesi,
          },
        },
        update: {
          status: absen.status,
          keterangan: absen.keterangan || null,
        },
        create: {
          riwayatId: absen.riwayatId,
          tanggal: parsedDate,
          sesi: sesi,
          status: absen.status,
          keterangan: absen.keterangan || null,
        },
      })
    );

    if (userSession && (userSession.role === "PENGAJAR" || userSession.role === "WALI_KELAS") && absenPengajar && kelasId) {
      operations.push(
        prisma.absenPengajar.upsert({
          where: {
            userId_tanggal_sesi: {
              userId: userSession.userId,
              tanggal: parsedDate,
              sesi: sesi,
            }
          },
          update: {
            waktuMulai: absenPengajar.waktuMulai,
            waktuSelesai: absenPengajar.waktuSelesai,
            materi: absenPengajar.materi,
            atributNametag: absenPengajar.atributNametag,
            atributKopiah: absenPengajar.atributKopiah,
            atributBros: absenPengajar.atributBros,
          },
          create: {
            userId: userSession.userId,
            kelasId: kelasId,
            tanggal: parsedDate,
            sesi: sesi,
            waktuMulai: absenPengajar.waktuMulai,
            waktuSelesai: absenPengajar.waktuSelesai,
            materi: absenPengajar.materi,
            atributNametag: absenPengajar.atributNametag,
            atributKopiah: absenPengajar.atributKopiah,
            atributBros: absenPengajar.atributBros,
          }
        })
      );
    }

    await prisma.$transaction(operations);

    return NextResponse.json({ success: true, count: operations.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal menyimpan absensi" }, { status: 500 });
  }
}
