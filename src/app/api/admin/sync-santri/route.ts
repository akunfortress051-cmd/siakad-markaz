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
  kategori?: string;
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
      const assignedRiwayat = santri.riwayat?.find(
        (r: any) => r.status === "ASSIGNED"
      );
      const sakanName = assignedRiwayat?.lemari?.kamar?.sakan?.nama ?? "-";

      // Hanya proses santri yang sudah ada sakan (aktif bulan ini)
      if (!sakanName || sakanName === "-") continue;

      const dufahNama = assignedRiwayat?.dufah?.nama ?? "-";

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
          kamar: assignedRiwayat?.lemari?.kamar?.nama ?? "-",
          nomorLemari: assignedRiwayat?.lemari?.nomor ?? "-",
          dufahNama: dufahNama,
          kategori: santri.kategori ?? "-",
          noWaSantri: santri.noWaSantri ?? "-",
          kabupaten: santri.kabupaten ?? "-",
          bulanKe: assignedRiwayat?.bulanKe ?? 0,
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
          kamar: assignedRiwayat?.lemari?.kamar?.nama ?? "-",
          nomorLemari: assignedRiwayat?.lemari?.nomor ?? "-",
          dufahNama: dufahNama,
          kategori: santri.kategori ?? "-",
          noWaSantri: santri.noWaSantri ?? "-",
          kabupaten: santri.kabupaten ?? "-",
          bulanKe: assignedRiwayat?.bulanKe ?? 0,
          isAktif: santri.isAktif ?? false,
          lastSyncedAt: now,
        },
      });
      syncedCount++;
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
          const wasBulan2 = pr.kelas?.is_akbarnas_b2;
          if (pr.kelasId && pr.programId && !wasBulan2) {
            santriToAkbarnasClass.set(pr.santriId, {
              programId: pr.programId,
              kelasId: pr.kelasId,
            });
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
            return {
              santriId: s.id,
              dufahNama: s.dufahNama!,
              programId: pastAkbarnas ? pastAkbarnas.programId : null,
              kelasId: pastAkbarnas ? pastAkbarnas.kelasId : null,
              is_tasmi: false,
              status_kelulusan: "TIDAK_LULUS",
            };
          }),
          skipDuplicates: true,
        });
        newRiwayatCount = missingRiwayat.length;
      }
    }

    // ===== 4. Auto-toggle Akbarnas classes jika ada Dufah baru =====
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
          const classes = await prisma.kelas.findMany({
            where: { programId: { in: akbarnasIds } },
            select: { id: true, is_akbarnas_b2: true },
          });

          for (const cls of classes) {
            await prisma.kelas.update({
              where: { id: cls.id },
              data: { is_akbarnas_b2: !cls.is_akbarnas_b2 },
            });
          }
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
