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
  if (userSession && userSession.role !== "ADMIN") {
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

    // GUARD: Jika frontend mengirim data absenPengajar tapi session null/expired,
    // kembalikan 401 agar frontend bisa mengarahkan ke login (mencegah silent failure)
    if (absenPengajar && !userSession) {
      return NextResponse.json(
        { error: "Sesi login telah berakhir. Silakan login ulang untuk menyimpan data pengajar." },
        { status: 401 }
      );
    }

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

    const isTeacherSubmit = userSession && userSession.role !== "ADMIN";
    const isAdminBackupSubmit = userSession && userSession.role === "ADMIN" && payload.targetUserId;

    if ((isTeacherSubmit || isAdminBackupSubmit) && absenPengajar && kelasId) {
      const targetUserId = isTeacherSubmit ? userSession.userId : payload.targetUserId;
      let actualKelasId = kelasId;

      if (kelasId.startsWith("PROGRAM_")) {
        const programId = kelasId.replace("PROGRAM_", "");
        const firstClass = await prisma.kelas.findFirst({
          where: { programId: programId }
        });
        if (firstClass) {
          actualKelasId = firstClass.id;
        } else {
          return NextResponse.json({ error: "Program tidak memiliki kelas satupun" }, { status: 400 });
        }
      }

      operations.push(
        prisma.absenPengajar.upsert({
          where: {
            userId_tanggal_sesi: {
              userId: targetUserId,
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
            kecerdasan: absenPengajar.kecerdasan || null,
            isBadal: absenPengajar.isBadal ?? false,
            pengajarDigantikanId: absenPengajar.pengajarDigantikanId || null,
          },
          create: {
            userId: targetUserId,
            kelasId: actualKelasId,
            tanggal: parsedDate,
            sesi: sesi,
            waktuMulai: absenPengajar.waktuMulai,
            waktuSelesai: absenPengajar.waktuSelesai,
            materi: absenPengajar.materi,
            atributNametag: absenPengajar.atributNametag,
            atributKopiah: absenPengajar.atributKopiah,
            atributBros: absenPengajar.atributBros,
            kecerdasan: absenPengajar.kecerdasan || null,
            isBadal: absenPengajar.isBadal ?? false,
            pengajarDigantikanId: absenPengajar.pengajarDigantikanId || null,
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
