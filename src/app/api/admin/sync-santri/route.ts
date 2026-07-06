import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const PPDB_URL = process.env.NEXT_PUBLIC_PPDB_URL || "https://ppdb.markazarabiyah.site";

type ApiSantriResponse = {
  id: string;
  nis?: string;
  nama: string;
  gender: string;
  tempatLahir?: string | null;
  tanggalLahir?: string | null;
  detailAlamat?: string | null;
  noWaSantri?: string | null;
  kabupaten?: string | null;
  riwayat?: Array<{
    status?: string;
    bulanKe?: number;
    dufah?: {
      nama?: string;
      tanggalBuka?: string;
      tanggalTutup?: string;
    } | null;
    lemari?: {
      nomor?: string | null;
      kamar?: {
        nama?: string | null;
        sakan?: {
          nama?: string | null;
        } | null;
      } | null;
    } | null;
  }>;
  isAktif?: boolean;
  kategoriSiswa?: string;
  kategori?: string;
  kategoriProgram?: string;
  programAktif?: string | null;
};

export async function POST() {
  try {
    const apiKey = process.env.PPDB_API_KEY || "markaz-siakad-api-2026";
    const response = await fetch(
      `${PPDB_URL}/api/santri/siakad?key=${apiKey}&filter=AKTIF`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: `API PPDB gagal: HTTP ${response.status}` },
        { status: 502 }
      );
    }

    const json = await response.json();
    const dataArray = Array.isArray(json) ? json : json.data;
    if (!Array.isArray(dataArray)) {
      return NextResponse.json(
        { error: "Format response API PPDB tidak sesuai" },
        { status: 502 }
      );
    }

    const validSantri = dataArray.filter(
      (s: ApiSantriResponse) => s.nis && s.nis.trim() !== ""
    );

    const now = new Date();
    let syncedCount = 0;
    let newRiwayatCount = 0;

    // ===== 1. Sync Dufah table terlebih dahulu =====
    const validDufahNames = new Set<string>();
    for (const santri of validSantri) {
      const assignedRiwayat = santri.riwayat?.find(
        (r: any) => r.status === "ASSIGNED"
      );
      const dufahNama = assignedRiwayat?.dufah?.nama;
      if (dufahNama && dufahNama !== "-") {
        validDufahNames.add(dufahNama);
      }
    }

    const existingDufahs = await prisma.dufah.findMany({
      select: { nama: true },
    });
    const existingDufahNames = new Set(existingDufahs.map((d) => d.nama));
    const missingDufahs = Array.from(validDufahNames).filter(
      (name) => !existingDufahNames.has(name)
    );

    if (missingDufahs.length > 0) {
      await prisma.dufah.createMany({
        data: missingDufahs.map((nama) => ({ nama })),
        skipDuplicates: true,
      });
    }

    // ===== 2. Upsert semua santri ke SantriInternal =====
    for (const santri of validSantri) {
      // Prioritaskan ASSIGNED. Tapi jika tidak ada ASSIGNED di riwayat TERBARU,
      // kita perbolehkan PRE_LIST untuk kasus Akbarnas B2 (dimana lemari blm di-assign ulang).
      let targetRiwayat = santri.riwayat?.find((r: any) => r.status === "ASSIGNED");
      
      // Jika riwayat terbaru di PPDB (index 0) adalah PRE_LIST, gunakan itu sbg ganti
      if (santri.riwayat && santri.riwayat[0]?.status === "PRE_LIST") {
        targetRiwayat = santri.riwayat[0];
      }

      if (!targetRiwayat) continue;

      let sakanName = targetRiwayat.lemari?.kamar?.sakan?.nama;
      let kamarName = targetRiwayat.lemari?.kamar?.nama;
      let nomorLemari = targetRiwayat.lemari?.nomor;

      if (!sakanName) {
        // Fallback ke riwayat ASSIGNED lama untuk sakan
        const oldAssigned = santri.riwayat?.find((r: any) => r.status === "ASSIGNED" && r.id !== targetRiwayat.id);
        if (oldAssigned) {
          sakanName = oldAssigned.lemari?.kamar?.sakan?.nama;
          kamarName = oldAssigned.lemari?.kamar?.nama;
          nomorLemari = oldAssigned.lemari?.nomor;
        }
      }

      sakanName = sakanName ?? "-";
      kamarName = kamarName ?? "-";
      nomorLemari = nomorLemari ?? "-";

      // Hanya proses santri yang sudah ada sakan (aktif bulan ini)
      if (sakanName === "-") continue;

      const dufahNama = targetRiwayat.dufah?.nama ?? "-";

      await prisma.santriInternal.upsert({
        where: { id: santri.nis as string },
        create: {
          id: santri.nis as string,
          nama: santri.nama,
          gender: santri.gender,
          tempat_lahir: santri.tempatLahir ?? "",
          tanggal_lahir: santri.tanggalLahir ?? null,
          alamat: santri.detailAlamat ?? "",
          sakan: sakanName,
          kamar: kamarName,
          nomorLemari: nomorLemari,
          dufahNama: dufahNama,
          kategori: santri.kategori ?? "-",
          noWaSantri: santri.noWaSantri ?? "-",
          kabupaten: santri.kabupaten ?? "-",
          bulanKe: targetRiwayat.bulanKe ?? 0,
          isAktif: santri.isAktif ?? false,
          lastSyncedAt: now,
        },
        update: {
          nama: santri.nama,
          gender: santri.gender,
          tempat_lahir: santri.tempatLahir ?? "",
          tanggal_lahir: santri.tanggalLahir ?? null,
          alamat: santri.detailAlamat ?? "",
          sakan: sakanName,
          kamar: kamarName,
          nomorLemari: nomorLemari,
          dufahNama: dufahNama,
          kategori: santri.kategori ?? "-",
          noWaSantri: santri.noWaSantri ?? "-",
          kabupaten: santri.kabupaten ?? "-",
          bulanKe: targetRiwayat.bulanKe ?? 0,
          isAktif: santri.isAktif ?? false,
          lastSyncedAt: now,
        },
      });
      syncedCount++;
    }

    // ===== 2.5 Deactivate santri yang sudah tidak ada di PPDB (tidak aktif) =====
    // ValidSantri berisi semua santri yang masih aktif di PPDB.
    // Jika ada santri di lokal yang isAktif = true, tapi ID-nya tidak ada di validSantri, berarti dia sudah nonaktif.
    const activeSantriIdsInPpdb = new Set(validSantri.map(s => s.nis as string));
    
    const localActiveSantri = await prisma.santriInternal.findMany({
      where: { isAktif: true },
      select: { id: true }
    });

    const santriToDeactivate = localActiveSantri
      .filter(s => !activeSantriIdsInPpdb.has(s.id))
      .map(s => s.id);

    let deactivatedCount = 0;
    if (santriToDeactivate.length > 0) {
      const updateResult = await prisma.santriInternal.updateMany({
        where: { id: { in: santriToDeactivate } },
        data: { 
          isAktif: false,
          lastSyncedAt: now 
        }
      });
      deactivatedCount = updateResult.count;
    }

    // ===== 3. Auto-create RiwayatSantri untuk santri aktif yang belum ada =====
    const activeSantriList = await prisma.santriInternal.findMany({
      where: {
        isAktif: true,
        dufahNama: { not: null },
        sakan: { not: "-" },
      },
    });

    const activeSantriWithDufah = activeSantriList.filter(
      (s) => s.dufahNama && s.dufahNama !== "-"
    );

    let continuingAkbarnasCount = 0;

    if (activeSantriWithDufah.length > 0) {
      const existingRiwayat = await prisma.riwayatSantri.findMany({
        where: {
          santriId: { in: activeSantriWithDufah.map((s) => s.id) },
        },
        select: { santriId: true, dufahNama: true, programId: true, kelasId: true, is_tasmi: true },
        orderBy: { id: "desc" },
      });

      const riwayatSet = new Set(
        existingRiwayat.map((r) => `${r.santriId}_${r.dufahNama}`)
      );

      // For Akbarnas auto-carry-over
      const previousRiwayats = await prisma.riwayatSantri.findMany({
        where: {
          santriId: { in: activeSantriWithDufah.map((s) => s.id) },
        },
        include: { program: true, kelas: true },
        orderBy: { id: "desc" },
      });

      const santriToAkbarnasClass = new Map<
        string,
        { programId: string; kelasId: string }
      >();

      for (const pr of previousRiwayats) {
        if (
          !santriToAkbarnasClass.has(pr.santriId) &&
          pr.program &&
          pr.program.nama_indo.toLowerCase().includes("akbarnas")
        ) {
           // We keep the old akbarnas logic to auto carry over if needed
          const wasBulan2 = pr.kelas?.is_akbarnas_b2;
          if (pr.kelasId && pr.programId && !wasBulan2) {
            santriToAkbarnasClass.set(pr.santriId, {
              programId: pr.programId,
              kelasId: pr.kelasId,
            });
          }
        }
      }

      // Map untuk matching program berdasarkan string 'programAktif' dari PPDB
      const allPrograms = await prisma.program.findMany({ select: { id: true, nama_indo: true } });
      const programMap = new Map();
      allPrograms.forEach(p => {
         programMap.set(p.nama_indo.toLowerCase().trim(), p.id);
      });

      // Buat lookup dari list PPDB (validSantri) untuk mengambil programAktif nya
      const santriProgramMap = new Map<string, string>();
      for (const s of validSantri) {
        if (s.programAktif && s.nis) {
           const mappedId = programMap.get(s.programAktif.toLowerCase().trim());
           if (mappedId) {
             santriProgramMap.set(s.nis as string, mappedId);
           }
        }
      }

      const missingRiwayat = activeSantriWithDufah.filter(
        (s) => !riwayatSet.has(`${s.id}_${s.dufahNama}`)
      );

      if (missingRiwayat.length > 0) {
        await prisma.riwayatSantri.createMany({
          data: missingRiwayat.map((s) => {
            const pastAkbarnas = santriToAkbarnasClass.get(s.id);
            // Ambil program langsung dari mapping hasil sinkronisasi PPDB
            const activeProgramId = santriProgramMap.get(s.id) || null;
            
            if (pastAkbarnas) continuingAkbarnasCount++;
            return {
              santriId: s.id,
              dufahNama: s.dufahNama!,
              // Prioritaskan program aktif dari PPDB (kecuali untuk Akbarnas auto-lanjut)
              programId: pastAkbarnas ? pastAkbarnas.programId : activeProgramId,
              kelasId: pastAkbarnas ? pastAkbarnas.kelasId : null,
              is_tasmi: false,
              status_kelulusan: "TIDAK_LULUS",
            };
          }),
          skipDuplicates: true,
        });
        newRiwayatCount = missingRiwayat.length;
      }

      // Update RiwayatSantri yang sudah ada jika programnya masih kosong (null)
      const existingToUpdate = existingRiwayat.filter(r => r.programId === null);
      if (existingToUpdate.length > 0) {
        // Karena Prisma tidak support bulk update dengan value berbeda-beda, kita loop atau updateMany per program
        for (const [nis, mappedProgId] of santriProgramMap.entries()) {
          const matchingToUpdate = existingToUpdate.filter(r => r.santriId === nis);
          if (matchingToUpdate.length > 0) {
            await prisma.riwayatSantri.updateMany({
              where: {
                santriId: nis,
                dufahNama: { in: matchingToUpdate.map(m => m.dufahNama) },
                programId: null
              },
              data: {
                programId: mappedProgId
              }
            });
          }
        }
      }
    }

    // ===== 4. Auto-toggle Akbarnas classes jika ada Dufah baru =====
    // DETERMINISTIC TOGGLE: Jika ada Dufah baru, hindari "blind toggle"
    // Gunakan fakta: jika ada santri yg dilanjutkan (carry over), maka WAJIB Bulan 2.
    // Jika tidak ada yg dilanjutkan (Bulan 1 baru), maka WAJIB Bulan 1.
    if (missingDufahs.length > 0) {
      try {
        const akbarnasPrograms = await prisma.program.findMany({
          where: {
            nama_indo: { contains: "akbarnas", mode: "insensitive" },
          },
          select: { id: true },
        });
        const akbarnasIds = akbarnasPrograms.map((p) => p.id);

        if (akbarnasIds.length > 0) {
          const isBulan2Baru = continuingAkbarnasCount > 0;
          await prisma.kelas.updateMany({
            where: { programId: { in: akbarnasIds } },
            data: { is_akbarnas_b2: isBulan2Baru },
          });
        }
      } catch (err) {
        console.error(
          "Gagal auto-toggle kelas Akbarnas saat sync Dufah",
          err
        );
      }
    }

    return NextResponse.json({
      success: true,
      syncedCount,
      newRiwayatCount,
      newDufahCount: missingDufahs.length,
      deactivatedCount,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error("Sync santri error:", error);
    return NextResponse.json(
      { error: error.message || "Terjadi kesalahan saat sinkronisasi" },
      { status: 500 }
    );
  }
}

// GET: Return last sync timestamp
export async function GET() {
  try {
    const lastSynced = await prisma.santriInternal.findFirst({
      where: { lastSyncedAt: { not: null } },
      orderBy: { lastSyncedAt: "desc" },
      select: { lastSyncedAt: true },
    });

    const totalSantri = await prisma.santriInternal.count({
      where: { isAktif: true },
    });

    return NextResponse.json({
      lastSyncedAt: lastSynced?.lastSyncedAt?.toISOString() ?? null,
      totalSantriAktif: totalSantri,
    });
  } catch {
    return NextResponse.json({ lastSyncedAt: null, totalSantriAktif: 0 });
  }
}
