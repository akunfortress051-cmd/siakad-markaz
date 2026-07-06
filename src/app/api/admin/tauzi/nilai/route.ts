import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { checkPermission } from "@/lib/permission";

export async function PUT(request: Request) {
  const session = await getSession();
  const hasPermission = await checkPermission("tauzi_nilai");
  
  if (!session || (!hasPermission && session.role !== 'ADMIN')) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, nilaiMuqobalah, programRekomendasiId, penyimakNama, santriId, sesiTauziId, programId } = body;

    if (!id) {
      return NextResponse.json({ error: "id peserta wajib dikirim" }, { status: 400 });
    }

    // Mulai transaction agar RiwayatSantri juga ikut diupdate sesuai programRekomendasi yang dipiih pengajar!
    const updated = await prisma.$transaction(async (tx) => {
      let p;
      if (id.startsWith("dummy_")) {
        // Create new
        p = await tx.pesertaTauzi.create({
          data: {
            santriId,
            sesiTauziId,
            programId,
            sudahUjian: false,
            nilaiMuqobalah: nilaiMuqobalah !== undefined ? Number(nilaiMuqobalah) : null,
            programRekomendasiId: programRekomendasiId || null,
            penyimakNama: penyimakNama || null,
          },
          include: {
            programRekomendasi: { select: { nama_indo: true } },
            sesiTauzi: { select: { dufahNama: true } }
          }
        });
      } else {
        p = await tx.pesertaTauzi.update({
          where: { id },
          data: {
            nilaiMuqobalah: nilaiMuqobalah !== undefined ? Number(nilaiMuqobalah) : null,
            programRekomendasiId: programRekomendasiId || null,
            penyimakNama: penyimakNama || null,
          },
          include: {
            programRekomendasi: { select: { nama_indo: true } },
            sesiTauzi: { select: { dufahNama: true } }
          }
        });
      }

      // Update RiwayatSantri di Dufah yang sama jika diberi rekomendasi program!
      if (programRekomendasiId && p.sesiTauzi?.dufahNama) {
        // Cari RiwayatSantri yang aktif di sesi bulan ini
        const riwayatList = await tx.riwayatSantri.findMany({
          where: { santriId: p.santriId, dufahNama: p.sesiTauzi.dufahNama }
        });
        
        if (riwayatList.length > 0) {
          await tx.riwayatSantri.updateMany({
            where: {
              santriId: p.santriId,
              dufahNama: p.sesiTauzi.dufahNama
            },
            data: {
              programId: programRekomendasiId,
              // Bisa juga reset kelasId di sini tapi biarkan saja admin yang adjust
            }
          });
        }
      }

      return p;
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating nilai peserta:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan nilai peserta" },
      { status: 500 }
    );
  }
}
