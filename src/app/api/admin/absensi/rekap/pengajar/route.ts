import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dari = searchParams.get("dari");
  const sampai = searchParams.get("sampai");

  if (!dari || !sampai) {
    return NextResponse.json({ error: "Parameter rentang tanggal tidak lengkap" }, { status: 400 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let isTeacher = false;
    if (session.role !== "ADMIN") {
      const psCount = await prisma.pengajarSesi.count({
        where: { userId: session.userId }
      });
      if (psCount > 0 || session.kelasId) {
        isTeacher = true;
      }
    }

    const whereClause: any = {
      tanggal: {
        gte: new Date(`${dari}T00:00:00Z`),
        lte: new Date(`${sampai}T23:59:59Z`),
      }
    };

    if (isTeacher) {
      whereClause.userId = session.userId;
    }

    const records = await prisma.absenPengajar.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, nama: true, username: true } },
        kelas: { select: { id: true, nama: true, program: { select: { id: true, nama_indo: true } } } },
        pengajarDigantikan: { select: { id: true, nama: true } },
      }
    });

    const pengajarSesiProgramList = await prisma.pengajarSesiProgram.findMany({
      where: isTeacher ? { userId: session.userId } : undefined,
      include: { 
        user: { select: { id: true, nama: true, username: true } },
        program: { select: { id: true, nama_indo: true } }
      }
    });

    const jadwalSesiList = await prisma.jadwalSesi.findMany();
    const jadwalMap = new Map(jadwalSesiList.map(j => [j.sesi, j]));

    const formatted = records.map(r => {
      const jadwal = jadwalMap.get(r.sesi);
      let terlambatMenit = 0;
      if (jadwal && r.waktuMulai && r.waktuMulai !== "-") {
        const [hM, mM] = r.waktuMulai.split(":").map(Number);
        const [hB, mB] = jadwal.jamBuka.split(":").map(Number);
        const totalMinutesMulai = (hM * 60) + mM;
        let totalMinutesBuka = (hB * 60) + mB;

        // Handle cross-midnight (e.g. jamBuka 23:59, waktuMulai 00:03)
        if (totalMinutesBuka > 1200 && totalMinutesMulai < 120) {
          totalMinutesBuka -= 24 * 60;
        }

        const diff = totalMinutesMulai - totalMinutesBuka;
        if (diff > 0) {
          terlambatMenit = diff;
        }
      }

      // Cek apakah guru ini di-assign via program level di sesi ini
      const isProgramLevel = pengajarSesiProgramList.some(
        psp => psp.userId === r.userId && psp.programId === r.kelas.program?.id && psp.sesi === r.sesi
      );

      return {
        id: r.id,
        pengajar: r.user.nama,
        kelas: isProgramLevel ? `Program ${r.kelas.program?.nama_indo}` : r.kelas.nama,
        tanggal: r.tanggal.toISOString().split("T")[0],
        sesi: r.sesi,
        materi: r.materi || "-",
        waktuMulai: r.waktuMulai,
        waktuSelesai: r.waktuSelesai,
        status: "HADIR",
        isBadal: r.isBadal,
        pengajarDigantikan: r.pengajarDigantikan?.nama || null,
        atribut: {
          nametag: r.atributNametag,
          kopiah: r.atributKopiah,
          bros: r.atributBros,
        },
        terlambatMenit,
      };
    });

    const dufahs = await prisma.dufah.findMany();
    
    // Get today's date in WIB to prevent marking future days as ALPHA
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric', month: '2-digit', day: '2-digit'
    });
    const todayStr = formatter.format(new Date());
    const todayDate = new Date(`${todayStr}T00:00:00Z`);

    const activeDates = new Set<string>();
    const startDate = new Date(`${dari}T00:00:00Z`);
    const endDate = new Date(`${sampai}T23:59:59Z`);
    
    let curr = new Date(startDate);
    while (curr <= endDate) {
      const dStr = curr.toISOString().split("T")[0];
      const dDate = new Date(`${dStr}T00:00:00Z`);
      
      let isActive = false;
      for (const d of dufahs) {
        if (d.usbu1Active && d.usbu1StartDate && d.usbu1EndDate) {
          if (dDate >= d.usbu1StartDate && dDate <= d.usbu1EndDate) isActive = true;
        }
        if (d.usbu2Active && d.usbu2StartDate && d.usbu2EndDate) {
          if (dDate >= d.usbu2StartDate && dDate <= d.usbu2EndDate) isActive = true;
        }
        if (d.usbu3Active && d.usbu3StartDate && d.usbu3EndDate) {
          if (dDate >= d.usbu3StartDate && dDate <= d.usbu3EndDate) isActive = true;
        }
      }
      
      // Only mark as active for ALPHA checking if the date has already passed or is today
      if (isActive && dDate <= todayDate) {
        activeDates.add(dStr);
      }
      curr.setDate(curr.getDate() + 1);
    }

    const pengajarSesi = await prisma.pengajarSesi.findMany({
      where: isTeacher ? { userId: session.userId } : undefined,
      include: { 
        user: { select: { id: true, nama: true, username: true } },
        kelas: { select: { nama: true } }
      }
    });

    for (const tgl of activeDates) {
      for (const teacher of pengajarSesi) {
        // Jika kelas sudah diajar (baik oleh guru asli maupun badal), jangan anggap guru asli ALPHA
        const classWasTaught = records.some(r => r.kelasId === teacher.kelasId && r.sesi === teacher.sesi && r.tanggal.toISOString().split("T")[0] === tgl);
        if (!classWasTaught) {
          formatted.push({
            id: `alpha_${teacher.userId}_${teacher.kelasId}_${teacher.sesi}_${tgl}`,
            pengajar: teacher.user.nama,
            kelas: teacher.kelas.nama,
            tanggal: tgl,
            sesi: teacher.sesi,
            materi: "ALPHA (Belum Absen)",
            waktuMulai: "-",
            waktuSelesai: "-",
            status: "ALPHA",
            isBadal: false,
            pengajarDigantikan: null,
            atribut: { nametag: false, kopiah: false, bros: false },
            terlambatMenit: 0,
          });
        }
      }

      // ALPHA detection for Program Level
      for (const teacher of pengajarSesiProgramList) {
        // Cek apakah ada record absen dari guru ini untuk sesi ini pada program ini
        // Kita bandingkan via programId dari relasi kelas di record
        const programWasTaught = records.some(
          r => r.userId === teacher.userId && r.sesi === teacher.sesi && r.kelas.program?.id === teacher.programId && r.tanggal.toISOString().split("T")[0] === tgl
        );
        if (!programWasTaught) {
          formatted.push({
            id: `alpha_${teacher.userId}_PROGRAM_${teacher.programId}_${teacher.sesi}_${tgl}`,
            pengajar: teacher.user.nama,
            kelas: `Program ${teacher.program.nama_indo}`,
            tanggal: tgl,
            sesi: teacher.sesi,
            materi: "ALPHA (Belum Absen)",
            waktuMulai: "-",
            waktuSelesai: "-",
            status: "ALPHA",
            isBadal: false,
            pengajarDigantikan: null,
            atribut: { nametag: false, kopiah: false, bros: false },
            terlambatMenit: 0,
          });
        }
      }
    }

    formatted.sort((a, b) => {
      if (a.tanggal !== b.tanggal) return a.tanggal.localeCompare(b.tanggal);
      if (a.sesi !== b.sesi) return a.sesi.localeCompare(b.sesi);
      return a.pengajar.localeCompare(b.pengajar);
    });

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Error fetching rekap pengajar:", error);
    return NextResponse.json({ error: "Terjadi kesalahan sistem" }, { status: 500 });
  }
}
