import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nama, action } = body; // action is 'NEXT' or 'PREVIOUS'

    if (!nama || !['NEXT', 'PREVIOUS'].includes(action)) {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }

    const dufah = await prisma.dufah.findUnique({
      where: { nama },
      include: { riwayatRecords: true }
    });

    if (!dufah) {
      return NextResponse.json({ error: "Angkatan tidak ditemukan" }, { status: 404 });
    }

    const now = new Date();
    let updateData: any = {};
    let targetUsbuSnapshotToCreate: number | null = null;
    let targetUsbuSnapshotToDelete: number | null = null;

    if (action === 'NEXT') {
      if (dufah.currentUsbu === 1) {
        updateData = { currentUsbu: 2, usbu1EndDate: now };
        targetUsbuSnapshotToCreate = 1;
      } else if (dufah.currentUsbu === 2) {
        updateData = { currentUsbu: 3, usbu2EndDate: now };
        targetUsbuSnapshotToCreate = 2;
      } else if (dufah.currentUsbu === 3) {
        updateData = { currentUsbu: 4, usbu3EndDate: now }; // 4 means finished
        targetUsbuSnapshotToCreate = 3;
      } else {
        return NextResponse.json({ error: "Dufah sudah selesai" }, { status: 400 });
      }
    } else if (action === 'PREVIOUS') {
      if (dufah.currentUsbu === 2) {
        updateData = { currentUsbu: 1, usbu1EndDate: null };
        targetUsbuSnapshotToDelete = 1;
      } else if (dufah.currentUsbu === 3) {
        updateData = { currentUsbu: 2, usbu2EndDate: null };
        targetUsbuSnapshotToDelete = 2;
      } else if (dufah.currentUsbu === 4) {
        updateData = { currentUsbu: 3, usbu3EndDate: null };
        targetUsbuSnapshotToDelete = 3;
      } else {
        return NextResponse.json({ error: "Dufah sudah berada di Usbu' 1" }, { status: 400 });
      }
    }

    // Gunakan Transaction agar aman
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update Dufah
      const updated = await tx.dufah.update({
        where: { nama },
        data: updateData,
      });

      // 2. Jika UNDO, hapus snapshot
      if (targetUsbuSnapshotToDelete !== null) {
        await tx.riwayatUsbu.deleteMany({
          where: {
            usbu: targetUsbuSnapshotToDelete,
            riwayat: { dufahNama: nama }
          }
        });
      }

      // 3. Jika NEXT, buat snapshot (Rapor Bayangan)
      if (targetUsbuSnapshotToCreate !== null) {
        // Untuk sekarang kita generate baris data (empty/0 values).
        // Hitungan agregasi asli bisa ditambahkan kemudian atau menggunakan query khusus.
        const snapshotData = dufah.riwayatRecords.map(r => ({
          riwayatId: r.id,
          usbu: targetUsbuSnapshotToCreate!,
          totalHadir: 0, // Placeholder
          totalIzin: 0,
          totalSakit: 0,
          totalAlpha: 0,
        }));
        
        if (snapshotData.length > 0) {
          await tx.riwayatUsbu.createMany({
            data: snapshotData,
            skipDuplicates: true
          });
        }
      }

      return updated;
    });

    return NextResponse.json({ success: true, dufah: result });
  } catch (error: any) {
    console.error("Usbu activation error:", error);
    return NextResponse.json(
      { error: "Gagal memproses aktivasi Usbu'" },
      { status: 500 }
    );
  }
}
