import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSantriSession } from "@/lib/santri-auth";
import { getMasterSantriList } from "@/lib/santri-api";

export async function GET() {
  const session = await getSantriSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const pengajuan = await prisma.checkoutPengajuan.findFirst({
      where: {
        santriId: session.santriId,
      },
      orderBy: { createdAt: "desc" },
      include: {
        approvals: {
          orderBy: { id: "asc" },
          include: {
            user: { select: { nama: true } }
          }
        }
      }
    });

    return NextResponse.json({ pengajuan });
  } catch (error) {
    console.error("Error fetching checkout pengajuan:", error);
    return NextResponse.json({ error: "Terjadi kesalahan sistem" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSantriSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { alasan } = body;

    if (!alasan || alasan.trim().length === 0) {
      return NextResponse.json({ error: "Alasan harus diisi" }, { status: 400 });
    }

    // Cek apakah ada pengajuan aktif
    const existing = await prisma.checkoutPengajuan.findFirst({
      where: {
        santriId: session.santriId,
        status: "MENUNGGU",
      }
    });

    if (existing) {
      return NextResponse.json({ error: "Anda sudah memiliki pengajuan check out aktif yang sedang menunggu persetujuan." }, { status: 400 });
    }

    const santriList = await getMasterSantriList();
    const ms = santriList.find(s => s.id === session.santriId);

    if (!ms) {
      return NextResponse.json({ error: "Master data santri tidak ditemukan." }, { status: 400 });
    }

    if (!ms.isAktif) {
      return NextResponse.json({ error: "Santri tidak aktif." }, { status: 400 });
    }

    // Cari riwayat santri terbaru / aktif
    const riwayat = await prisma.riwayatSantri.findFirst({
      where: { santriId: session.santriId, dufahNama: ms.dufahNama }
    });

    if (!riwayat) {
      return NextResponse.json({ error: "Riwayat santri tidak ditemukan untuk duf'ah saat ini." }, { status: 400 });
    }

    // Dapatkan kategori = "REGULER" atau "TURATS"
    const kategori = ms.kategori === "TURATS" ? "TURATS" : "REGULER"; // Bisa juga pakai ms.kategori (misal 'BARU'/'LAMA' = REGULER) 
    // FIXME: pastikan ms.kategori yang ada dari DB sesuai!
    // Kategori dari database SantriInternal itu 'BARU', 'LAMA', 'KSU'.
    // Kalau 'TURATS', program Turats pakai REGULER / TURATS? Ah wait, di Prisma Schema disebutkan Kategori: REGULER | TURATS. 
    // Tapi value dari master santri ms.kategori seringnya BARU/LAMA/KSU.
    // Gimana bedakan Turats?
    let targetKategori = "REGULER";
    
    // Mari kita cek kategori program dari riwayat jika ada
    let isTurats = false;
    if (riwayat.programId) {
       const program = await prisma.program.findUnique({ where: { id: riwayat.programId }});
       if (program && program.kategori === "TURATS") isTurats = true;
    }
    if (isTurats) targetKategori = "TURATS";

    // Ambil approver config
    const approvers = await prisma.checkoutApproverConfig.findMany({
      where: { kategori: targetKategori },
      orderBy: { urutan: "asc" }
    });

    if (approvers.length === 0) {
      return NextResponse.json({ error: "Sistem belum siap: Administrator belum mengatur pihak penyetuju untuk check out." }, { status: 400 });
    }

    // Buat pengajuan + approvals dalam transaction
    const result = await prisma.$transaction(async (tx) => {
      const pengajuan = await tx.checkoutPengajuan.create({
        data: {
          santriId: session.santriId,
          riwayatId: riwayat.id,
          alasan: alasan.trim(),
          status: "MENUNGGU",
        }
      });

      const approvalDataList = [];

      for (const a of approvers) {
        let finalUserId = a.userId;

        if (a.tipe === "WALI_KELAS") {
          if (!riwayat.kelasId) {
            throw new Error(`Gagal: Santri belum dimasukkan ke kelas, padahal approver ${a.label} memerlukan Wali Kelas.`);
          }
          const guru = await tx.user.findFirst({ where: { kelasId: riwayat.kelasId, isActive: true } });
          if (guru) finalUserId = guru.id;
        } else if (a.tipe === "DHOBIT_SAKAN") {
          if (!ms.sakan) {
            throw new Error(`Gagal: Santri belum memiliki asrama/sakan, padahal approver ${a.label} memerlukan Pembimbing Sakan.`);
          }
          const dhobit = await tx.user.findFirst({
            where: {
              sakan: ms.sakan,
              isActive: true,
              OR: [
                { nama: { contains: "Ustadz", mode: "insensitive" } },
                { nama: { contains: "Ust", mode: "insensitive" } }
              ]
            }
          });
          if (dhobit) finalUserId = dhobit.id;
        }

        if (!finalUserId) {
          throw new Error(`Sistem tidak dapat menemukan User untuk jabatan ${a.label}. Hubungi Administrator.`);
        }

        approvalDataList.push({
          pengajuanId: pengajuan.id,
          userId: finalUserId,
          label: a.label,
          status: "MENUNGGU"
        });
      }

      // Filter duplikat (misal 1 orang jadi GM sekaligus Wali Kelas)
      // Kita gabungkan label jabatannya jika dia merangkap
      const uniqueApprovalMap = new Map();
      for (const item of approvalDataList) {
        if (uniqueApprovalMap.has(item.userId)) {
           const existing = uniqueApprovalMap.get(item.userId);
           existing.label = `${existing.label} / ${item.label}`;
        } else {
           uniqueApprovalMap.set(item.userId, { ...item });
        }
      }
      const finalApprovalData = Array.from(uniqueApprovalMap.values());

      await tx.checkoutApproval.createMany({
        data: finalApprovalData
      });

      return await tx.checkoutPengajuan.findUnique({
        where: { id: pengajuan.id },
        include: { approvals: { orderBy: { id: 'asc' } } }
      });
    });

    return NextResponse.json({ success: true, pengajuan: result });

  } catch (error: any) {
    console.error("Error creating checkout pengajuan:", error);
    return NextResponse.json({ error: error?.message || "Terjadi kesalahan sistem" }, { status: 500 });
  }
}
