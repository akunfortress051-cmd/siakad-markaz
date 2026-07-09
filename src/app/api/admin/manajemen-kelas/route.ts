import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getMasterSantriById } from "@/lib/santri-api";
import { getActiveDufahName } from "@/lib/absensi";
import { getSession } from "@/lib/auth";
import { checkPermission } from "@/lib/permission";

export async function POST(request: Request) {
  const session = await getSession();
  const hasPermission = await checkPermission("alokasi_kelas_edit");
  if (!session || !hasPermission) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as {
      santriIds?: string[];
      kelasId?: string;
      programId?: string;
    };

    if (!payload.santriIds || payload.santriIds.length === 0) {
      return NextResponse.json({ error: "Pilih minimal satu santri." }, { status: 400 });
    }

    if (!payload.kelasId && !payload.programId) {
      return NextResponse.json({ error: "Kamar / Rombel atau Program tujuan wajib dipilih." }, { status: 400 });
    }

    // Verify kelasId exists
    let kelas = null;
    if (payload.kelasId) {
      kelas = await prisma.kelas.findUnique({
        where: { id: payload.kelasId },
      });
      if (!kelas) {
        return NextResponse.json({ error: "Ruang Kelas (Nama Kelas) tidak valid." }, { status: 404 });
      }
    }

    let finalProgramId = payload.programId || null;
    let finalKelasId = payload.kelasId || null;

    if (kelas) {
      finalProgramId = kelas.programId;
      finalKelasId = kelas.id;
    }

    // Fetch master data to get current dufahNama
    const masterDataResults = await Promise.all(
      payload.santriIds.map((id) => getMasterSantriById(id))
    );

    const activeDufahName = await getActiveDufahName();
    let activeDufahRiwayats: any[] = [];
    if (activeDufahName) {
      activeDufahRiwayats = await prisma.riwayatSantri.findMany({
        where: {
          santriId: { in: payload.santriIds },
          dufahNama: activeDufahName
        },
        select: { santriId: true }
      });
    }

    const operations: any[] = [];
    const uniqueDufahs = new Set<string>();
    
    for (let i = 0; i < payload.santriIds.length; i++) {
        const id = payload.santriIds[i];
        const ms = masterDataResults[i];
        if (!ms) continue;

        let targetDufah = ms.dufahNama;
        if (activeDufahName && activeDufahRiwayats.some(r => r.santriId === id)) {
          targetDufah = activeDufahName;
        }

        if (!uniqueDufahs.has(targetDufah)) {
          uniqueDufahs.add(targetDufah);
          operations.push(
            prisma.dufah.upsert({
               where: { nama: targetDufah },
               update: {},
               create: { nama: targetDufah }
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
        const updateData: any = {};
        if (finalProgramId) updateData.programId = finalProgramId;
        if (finalKelasId) updateData.kelasId = finalKelasId;
        // Jika sedang mengubah program secara manual tapi tidak menset kelas, hapus kelas (reset kelas ke unassigned)
        if (payload.programId && !payload.kelasId) {
          updateData.kelasId = null;
        }

        operations.push(
          prisma.riwayatSantri.upsert({
            where: {
              santriId_dufahNama: { santriId: id, dufahNama: targetDufah }
            },
            update: updateData,
            create: {
              santriId: id,
              dufahNama: targetDufah,
              programId: finalProgramId,
              kelasId: finalKelasId
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
