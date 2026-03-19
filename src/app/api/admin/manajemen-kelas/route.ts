import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

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
      return NextResponse.json({ error: "Kelas tujuan wajib dipilih." }, { status: 400 });
    }

    // Verify kelasId exists
    const kelas = await prisma.kelas.findUnique({
      where: { id: payload.kelasId },
    });

    if (!kelas) {
      return NextResponse.json({ error: "Kelas tidak valid." }, { status: 404 });
    }

    // Upsert each santri inside a transaction
    await prisma.$transaction(
      payload.santriIds.map((id) =>
        prisma.santriInternal.upsert({
          where: { id },
          update: { kelasId: payload.kelasId },
          create: { id, kelasId: payload.kelasId },
        })
      )
    );

    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/manajemen-kelas");
    revalidatePath("/admin/input-nilai");

    return NextResponse.json({ success: true, count: payload.santriIds.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal menyimpan data kelas." }, { status: 500 });
  }
}
