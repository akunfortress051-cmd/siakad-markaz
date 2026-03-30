import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getMasterSantriById } from "@/lib/santri-api";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      santriIds?: string[];
      kelasId?: string;
    };

    if (!payload.santriIds || payload.santriIds.length === 0) {
      return NextResponse.json({ error: "Pilih minimal satu santri." }, { status: 400 });
    }

    if (!payload.kelasId) {
      return NextResponse.json({ error: "Kamar / Rombel tujuan wajib dipilih." }, { status: 400 });
    }

    // Verify kelasId exists
    const kelas = await prisma.kelas.findUnique({
      where: { id: payload.kelasId },
    });

    if (!kelas) {
      return NextResponse.json({ error: "Ruang Kelas (Nama Kelas) tidak valid." }, { status: 404 });
    }

    // Fetch master data to get current dufahNama
    const masterDataResults = await Promise.all(
      payload.santriIds.map((id) => getMasterSantriById(id))
    );

    const operations: any[] = [];
    const uniqueDufahs = new Set<string>();
    
    for (let i = 0; i < payload.santriIds.length; i++) {
        const id = payload.santriIds[i];
        const ms = masterDataResults[i];
        if (!ms) continue;

        if (!uniqueDufahs.has(ms.dufahNama)) {
          uniqueDufahs.add(ms.dufahNama);
          operations.push(
            prisma.dufah.upsert({
               where: { nama: ms.dufahNama },
               update: {},
               create: { nama: ms.dufahNama }
            })
          );
        }

        // Ensure SantriInternal exists base record
        operations.push(
          prisma.santriInternal.upsert({
            where: { id },
            update: { nama: ms.nama },
            create: { id, nama: ms.nama },
          })
        );
        
        // Upsert RiwayatSantri for the active dufah
        operations.push(
          prisma.riwayatSantri.upsert({
            where: {
              santriId_dufahNama: { santriId: id, dufahNama: ms.dufahNama }
            },
            update: {
              programId: kelas.programId,
              kelasId: kelas.id
            },
            create: {
              santriId: id,
              dufahNama: ms.dufahNama,
              programId: kelas.programId,
              kelasId: kelas.id
            }
          })
        );
    }

    // Upsert each santri inside a transaction
    await prisma.$transaction(operations);

    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/syahadah");
    revalidatePath("/admin/manajemen-kelas");
    revalidatePath("/admin/input-nilai");

    return NextResponse.json({ success: true, count: payload.santriIds.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal menyimpan data kelas." }, { status: 500 });
  }
}
