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
      is_setoran_lulus?: boolean;
      nilaiList?: Array<{
        mapelId: string;
        skor: number;
      }>;
    };

    const masterSantri = await getMasterSantriById(id);

    if (!masterSantri) {
      return NextResponse.json({ error: "Santri tidak ditemukan di master API." }, { status: 404 });
    }

    if (!payload.kelasId) {
      return NextResponse.json({ error: "Kelas wajib dipilih." }, { status: 400 });
    }

    const kelas = await prisma.kelas.findUnique({
      where: { id: payload.kelasId },
      include: {
        kelasMapels: true,
      },
    });

    if (!kelas) {
      return NextResponse.json({ error: "Kelas tidak ditemukan." }, { status: 404 });
    }

    const nilaiList = payload.nilaiList ?? [];
    const expectedMapelIds = kelas.kelasMapels.map((kelasMapel) => kelasMapel.mapelId).sort();
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
      (nilai) => !Number.isInteger(nilai.skor) || nilai.skor < 0 || nilai.skor > 100,
    );

    if (invalidNilai) {
      return NextResponse.json({ error: "Nilai harus berupa bilangan bulat 0-100." }, { status: 400 });
    }

    const statusKelulusan = calculateStatus(
      {
        is_tasmi: payload.is_tasmi ?? false,
        is_setoran_lulus: payload.is_setoran_lulus ?? false,
      },
      nilaiList,
      kelas,
    );

    await prisma.$transaction(async (transaction) => {
      await transaction.santriInternal.upsert({
        where: { id },
        update: {
          kelasId: kelas.id,
          tempat_lahir: payload.tempat_lahir,
          tanggal_lahir: payload.tanggal_lahir,
          alamat: payload.alamat,
          is_tasmi: payload.is_tasmi ?? false,
          is_setoran_lulus: payload.is_setoran_lulus ?? false,
          status_kelulusan: statusKelulusan,
        },
        create: {
          id,
          kelasId: kelas.id,
          tempat_lahir: payload.tempat_lahir,
          tanggal_lahir: payload.tanggal_lahir,
          alamat: payload.alamat,
          is_tasmi: payload.is_tasmi ?? false,
          is_setoran_lulus: payload.is_setoran_lulus ?? false,
          status_kelulusan: statusKelulusan,
        },
      });

      await transaction.nilai.deleteMany({
        where: { santriId: id },
      });

      if (nilaiList.length > 0) {
        await transaction.nilai.createMany({
          data: nilaiList.map((nilai) => ({
            santriId: id,
            mapelId: nilai.mapelId,
            skor: nilai.skor,
          })),
        });
      }
    });

    revalidatePath("/admin/dashboard");
    revalidatePath(`/admin/input-nilai/${id}`);
    revalidatePath(`/ijazah/${id}`);
    revalidatePath(`/cetak/${id}`);

    return NextResponse.json({ success: true, status_kelulusan: statusKelulusan });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal menyimpan nilai santri." }, { status: 500 });
  }
}
