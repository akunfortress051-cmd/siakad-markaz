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

  // Izinkan akses dari cron internal menggunakan secret header
  const cronSecret = (request as any).headers?.get?.("x-cron-secret") || 
    new Headers(request.headers).get("x-cron-secret");
  const isCronRequest = cronSecret && cronSecret === process.env.CRON_SECRET;

  const session = (isCronRequest
    ? { role: "ADMIN", userId: null, kelasId: null }  // Treat cron sebagai admin
    : await getSession()) as any;

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

    // Fetch SesiTambahanProgram untuk mendeteksi keterlambatan sesi 7-10
    const sesiTambahanList = await prisma.sesiTambahanProgram.findMany({ where: { isActive: true } });

    const formatted = records.map(r => {
      let terlambatMenit = 0;
      // Badal: tidak dihitung keterlambatan berapapun menitnya
      if (r.terlambatMenit !== null) {
        terlambatMenit = r.terlambatMenit;
      } else if (!r.isBadal && r.waktuMulai && r.waktuMulai !== "-") {
        // Cari jadwal: prioritas global JadwalSesi, fallback ke SesiTambahanProgram (sesi 7-10)
        let jadwalBuka: string | null = jadwalMap.get(r.sesi)?.jamBuka ?? null;
        if (!jadwalBuka && r.kelas.program?.id) {
          const tambahan = sesiTambahanList.find(
            s => s.sesi === r.sesi && s.programId === r.kelas.program!.id
          );
          if (tambahan) jadwalBuka = tambahan.jamBuka;
        }

        if (jadwalBuka) {
          const [hM, mM] = r.waktuMulai.split(":").map(Number);
          const [hB, mB] = jadwalBuka.split(":").map(Number);
          const totalMinutesMulai = (hM * 60) + mM;
          let totalMinutesBuka = (hB * 60) + mB;

          // Handle cross-midnight (e.g. jamBuka 23:59, waktuMulai 00:03)
          if (totalMinutesBuka > 1200 && totalMinutesMulai < 120) {
            totalMinutesBuka -= 24 * 60;
          }

          const diff = totalMinutesMulai - totalMinutesBuka;
          // Grace period 5 menit: baru dianggap terlambat jika lebih dari 5 menit sejak jadwal buka
          if (diff > 5) {
            terlambatMenit = diff - 5;
          }
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

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, materi, waktuMulai, waktuSelesai, atributKopiah, atributNametag, atributBros, terlambatMenit, isBadal, pengajarBadalId } = body;

    if (!id) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    if (id.startsWith("alpha_")) {
      // Format: alpha_{userId}_{kelasId}_{sesi}_{tanggal}
      // OR Format: alpha_{userId}_PROGRAM_{programId}_{sesi}_{tanggal}
      const parts = id.split("_");
      let originalUserId = "", kelasId = "", sesi = "", tanggalStr = "";

      if (parts[2] === "PROGRAM") {
        originalUserId = parts[1];
        const programId = parts[3];
        sesi = parts[4];
        tanggalStr = parts[5];

        const firstClass = await prisma.kelas.findFirst({ where: { programId } });
        if (!firstClass) return NextResponse.json({ error: "Program tidak punya kelas" }, { status: 400 });
        kelasId = firstClass.id;
      } else {
        originalUserId = parts[1];
        kelasId = parts[2];
        sesi = parts[3];
        tanggalStr = parts[4];
      }

      const finalUserId = isBadal && pengajarBadalId ? pengajarBadalId : originalUserId;
      const finalPengajarDigantikanId = isBadal && pengajarBadalId ? originalUserId : null;

      const created = await prisma.absenPengajar.create({
        data: {
          userId: finalUserId,
          kelasId,
          sesi: sesi as any,
          tanggal: new Date(`${tanggalStr}T00:00:00Z`),
          waktuMulai: waktuMulai || "-",
          waktuSelesai: waktuSelesai || "-",
          materi: materi || "Hadir (Input Manual Admin)",
          atributKopiah: Boolean(atributKopiah),
          atributNametag: Boolean(atributNametag),
          atributBros: Boolean(atributBros),
          terlambatMenit: terlambatMenit !== undefined && terlambatMenit !== "" ? Number(terlambatMenit) : null,
          isBadal: Boolean(isBadal),
          pengajarDigantikanId: finalPengajarDigantikanId,
        }
      });
      return NextResponse.json({ success: true, data: created });
    }

    // Pastikan record ada
    const existing = await prisma.absenPengajar.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Data absen pengajar tidak ditemukan" }, { status: 404 });
    }

    const updated = await prisma.absenPengajar.update({
      where: { id },
      data: {
        materi: materi ?? existing.materi,
        waktuMulai: waktuMulai ?? existing.waktuMulai,
        waktuSelesai: waktuSelesai ?? existing.waktuSelesai,
        atributKopiah: atributKopiah !== undefined ? Boolean(atributKopiah) : existing.atributKopiah,
        atributNametag: atributNametag !== undefined ? Boolean(atributNametag) : existing.atributNametag,
        atributBros: atributBros !== undefined ? Boolean(atributBros) : existing.atributBros,
        terlambatMenit: terlambatMenit !== undefined && terlambatMenit !== "" ? Number(terlambatMenit) : null,
      }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating absen pengajar:", error);
    return NextResponse.json({ error: "Gagal memperbarui data" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const existing = await prisma.absenPengajar.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Data absen pengajar tidak ditemukan" }, { status: 404 });
    }

    await prisma.absenPengajar.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting absen pengajar:", error);
    return NextResponse.json({ error: "Gagal menghapus data" }, { status: 500 });
  }
}

