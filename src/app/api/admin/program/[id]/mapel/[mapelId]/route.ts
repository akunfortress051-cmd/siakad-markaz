import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// PUT /api/admin/program/[id]/mapel/[mapelId] — edit nama mapel
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; mapelId: string }> }
) {
  try {
    const { id, mapelId } = await params;
    const body = await request.json();
    const { nama_indo, nama_arab, jumlah_tes, tampil_di_syahadah, masuk_akumulasi } = body;

    if (!nama_indo?.trim() || !nama_arab?.trim()) {
      return NextResponse.json({ error: "Nama mapel (Indo & Arab) wajib diisi." }, { status: 400 });
    }

    // Cek duplikasi nama di dalam program yang sama (kecuali mapel ini sendiri)
    const duplicate = await prisma.programMapel.findFirst({
      where: {
        programId: id,
        mapelId: { not: mapelId },
        mapel: { nama_indo: nama_indo.trim() },
      },
    });
    if (duplicate) {
      return NextResponse.json({ error: "Nama mapel sudah digunakan di program ini." }, { status: 400 });
    }

    const updated = await prisma.mapel.update({
      where: { id: mapelId },
      data: { 
        nama_indo: nama_indo.trim(), 
        nama_arab: nama_arab.trim(),
        jumlah_tes: jumlah_tes !== undefined ? Number(jumlah_tes) : undefined,
        tampil_di_syahadah: tampil_di_syahadah !== undefined ? Boolean(tampil_di_syahadah) : undefined,
        masuk_akumulasi: masuk_akumulasi !== undefined ? Boolean(masuk_akumulasi) : undefined,
        bobot: body.bobot !== undefined ? Number(body.bobot) : undefined,
        bobot_usbu: body.bobot_usbu !== undefined ? Number(body.bobot_usbu) : undefined,
      },
    });

    return NextResponse.json({ success: true, mapel: updated });
  } catch (error) {
    console.error("Error updating mapel:", error);
    return NextResponse.json({ error: "Gagal mengubah mapel." }, { status: 500 });
  }
}

// DELETE /api/admin/program/[id]/mapel/[mapelId]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; mapelId: string }> }
) {
  try {
    const { id: programId, mapelId } = await params;

    // Cek apakah mapel ini sudah punya data nilai
    const hasNilai = await prisma.nilai.findFirst({ where: { mapelId } });

    // Selalu hapus relasi ProgramMapel (mapel tidak akan muncul lagi di form ke depannya)
    await prisma.programMapel.delete({
      where: { programId_mapelId: { programId, mapelId } },
    });

    // Jika tidak ada nilai, dan mapel ini sudah tidak dipakai program manapun, hapus mapel global
    if (!hasNilai) {
      const stillUsed = await prisma.programMapel.findFirst({ where: { mapelId } });
      if (!stillUsed) {
        await prisma.mapel.delete({ where: { id: mapelId } });
      }
    }

    return NextResponse.json({
      success: true,
      softDelete: !!hasNilai, // true = hanya relasi dihapus (nilai lama aman)
    });
  } catch (error) {
    console.error("Error deleting mapel:", error);
    return NextResponse.json({ error: "Gagal menghapus mapel." }, { status: 500 });
  }
}
