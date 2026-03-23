import { calculateStatus } from "@/lib/kelulusan";
import prisma from "@/lib/prisma";
import { getMasterSantriById } from "@/lib/santri-api";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const payload = (await request.json()) as {
      kelasId?: string;
      tempat_lahir?: string;
      tanggal_lahir?: string;
      alamat?: string;
      is_tasmi?: boolean;
      nilaiList?: Array<{
        mapelId: string;
        nilaiUsbu1: number | null;
        nilaiUsbu2: number | null;
        nilaiNihai: number | null;
        nilaiAkhir: number | null;
      }>;
    };

    const existingRiwayat = await prisma.riwayatSantri.findUnique({
      where: { id },
    });

    const santriId = existingRiwayat ? existingRiwayat.santriId : id;
    const masterSantri = await getMasterSantriById(santriId);

    if (!masterSantri) {
      return NextResponse.json({ error: "Santri tidak ditemukan di master API." }, { status: 404 });
    }

    const targetDufah = existingRiwayat ? existingRiwayat.dufahNama : masterSantri.dufahNama;

    if (!payload.kelasId) {
      return NextResponse.json({ error: "Ruangan kelas wajib dipilih." }, { status: 400 });
    }

    const kelas = await prisma.kelas.findUnique({
      where: { id: payload.kelasId },
    });

    if (!kelas) {
      return NextResponse.json({ error: "Ruang kelas tidak ditemukan." }, { status: 404 });
    }

    const program = await prisma.program.findUnique({
      where: { id: kelas.programId },
      include: {
        programMapels: true,
      },
    });

    if (!program) {
      return NextResponse.json({ error: "Program tidak ditemukan." }, { status: 404 });
    }

    const nilaiList = payload.nilaiList ?? [];
    const expectedMapelIds = program.programMapels.map((programMapel) => programMapel.mapelId).sort();
    const submittedMapelIds = nilaiList.map((nilai) => nilai.mapelId).sort();

    if (
      nilaiList.length !== expectedMapelIds.length ||
      JSON.stringify(expectedMapelIds) !== JSON.stringify(submittedMapelIds)
    ) {
      return NextResponse.json(
        { error: "Mapel yang dikirim harus sama persis dengan mapel kelas yang dipilih." },
        { status: 400 },
      );
    }

    const invalidNilai = nilaiList.find(
      (nilai) => 
        (nilai.nilaiUsbu1 !== null && (!Number.isFinite(nilai.nilaiUsbu1) || nilai.nilaiUsbu1! < 0 || nilai.nilaiUsbu1! > 100)) ||
        (nilai.nilaiUsbu2 !== null && (!Number.isFinite(nilai.nilaiUsbu2) || nilai.nilaiUsbu2! < 0 || nilai.nilaiUsbu2! > 100)) ||
        (nilai.nilaiNihai !== null && (!Number.isFinite(nilai.nilaiNihai) || nilai.nilaiNihai! < 0 || nilai.nilaiNihai! > 100))
    );

    if (invalidNilai) {
      return NextResponse.json({ error: "Nilai harus berupa bilangan 0-100." }, { status: 400 });
    }

    const statusKelulusan = calculateStatus(
      {
        is_tasmi: payload.is_tasmi ?? false,
      },
      nilaiList.map(n => ({ skor: n.nilaiAkhir || 0 })),
      program,
    );

    await prisma.$transaction(async (transaction) => {
      // 0. Auto-sync Dufah record 
      await transaction.dufah.upsert({
        where: { nama: targetDufah },
        update: {},
        create: { nama: targetDufah, currentUsbu: 1 }
      });

      // 1. Upsert Profil Dasar Santri
      await transaction.santriInternal.upsert({
        where: { id: santriId },
        update: {
          tempat_lahir: payload.tempat_lahir,
          tanggal_lahir: payload.tanggal_lahir,
          alamat: payload.alamat,
        },
        create: {
          id: santriId,
          tempat_lahir: payload.tempat_lahir,
          tanggal_lahir: payload.tanggal_lahir,
          alamat: payload.alamat,
        },
      });

      // 2. Upsert Riwayat Akademik untuk Duf'ah ter-target
      let riwayat;
      if (existingRiwayat) {
        riwayat = await transaction.riwayatSantri.update({
          where: { id: existingRiwayat.id },
          data: {
            programId: program.id,
            kelasId: kelas.id,
            is_tasmi: payload.is_tasmi ?? false,
            status_kelulusan: statusKelulusan,
          },
        });
      } else {
        riwayat = await transaction.riwayatSantri.upsert({
          where: {
            santriId_dufahNama: {
              santriId: santriId,
              dufahNama: targetDufah,
            },
          },
          update: {
            programId: program.id,
            kelasId: kelas.id,
            is_tasmi: payload.is_tasmi ?? false,
            status_kelulusan: statusKelulusan,
          },
          create: {
            santriId: santriId,
            dufahNama: targetDufah,
            programId: program.id,
            kelasId: kelas.id,
            is_tasmi: payload.is_tasmi ?? false,
            status_kelulusan: statusKelulusan,
          },
        });
      }

      // 3. Reset dan Simpan Nilai untuk Riwayat ini
      await transaction.nilai.deleteMany({
        where: { riwayatId: riwayat.id },
      });

      if (nilaiList.length > 0) {
        await transaction.nilai.createMany({
          data: nilaiList.map((nilai: any) => ({
            riwayatId: riwayat.id,
            mapelId: nilai.mapelId,
            nilaiUsbu1: nilai.nilaiUsbu1,
            nilaiUsbu2: nilai.nilaiUsbu2,
            nilaiNihai: nilai.nilaiNihai,
            nilaiAkhir: nilai.nilaiAkhir,
          })),
        });
      }
    });

    revalidatePath("/admin/syahadah");
    revalidatePath(`/admin/input-nilai/${id}`);
    revalidatePath(`/ijazah/${id}`);
    revalidatePath(`/cetak/${id}`);

    return NextResponse.json({ success: true, status_kelulusan: statusKelulusan });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal menyimpan nilai santri." }, { status: 500 });
  }
}

