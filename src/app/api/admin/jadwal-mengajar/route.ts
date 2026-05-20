import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { kelasId, sesi, userId } = body;

    if (!kelasId || !sesi) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // Gunakan transaction
    await prisma.$transaction(async (tx) => {
      // 1. Remove ANY teacher from the TARGET kelasId & sesi
      await tx.pengajarSesi.deleteMany({
        where: { kelasId, sesi }
      });

      if (userId) {
        // 2. Remove THIS teacher from ANY OTHER class in the SAME sesi 
        // (Satu pengajar tidak bisa mengajar 2 kelas di waktu yang sama)
        await tx.pengajarSesi.deleteMany({
          where: { userId, sesi }
        });

        // 3. Create the new assignment
        await tx.pengajarSesi.create({
          data: {
            kelasId,
            sesi,
            userId
          }
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Plotting error:", error);
    return NextResponse.json({ error: "Gagal menyimpan jadwal" }, { status: 500 });
  }
}
