import { syncStatusKelulusanByKelasIds } from "@/lib/app-data";
import { formatDateIndo, translateDateToArabic } from "@/lib/formatters";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function PUT(request: Request) {
  try {
    const payload = (await request.json()) as {
      tanggalCetak?: string;
      kelas?: Array<{ id: string; kkm: number }>;
      template?: {
        nama_mudir_indo?: string;
        nama_mudir_arab?: string;
        jabatan_mudir_indo?: string;
        jabatan_mudir_arab?: string;
      };
    };

    if (!payload.tanggalCetak) {
      return NextResponse.json({ error: "Tanggal cetak wajib diisi." }, { status: 400 });
    }

    const tanggalCetak = payload.tanggalCetak;
    const kelasUpdates = payload.kelas ?? [];
    const invalidKkm = kelasUpdates.find(
      (kelas) => !Number.isInteger(kelas.kkm) || kelas.kkm < 0 || kelas.kkm > 100,
    );

    if (invalidKkm) {
      return NextResponse.json({ error: "KKM harus berupa bilangan bulat 0-100." }, { status: 400 });
    }

    await prisma.$transaction(async (transaction) => {
      for (const kelas of kelasUpdates) {
        await transaction.kelas.update({
          where: { id: kelas.id },
          data: { kkm: kelas.kkm },
        });
      }

      const existingTemplate = await transaction.syahadahTemplate.findFirst({ orderBy: { id: "asc" } });
      const templateData = {
        tgl_cetak_indo: formatDateIndo(tanggalCetak),
        tgl_cetak_arab: translateDateToArabic(tanggalCetak),
        nama_mudir_indo: payload.template?.nama_mudir_indo?.trim() || "Nama Mudir",
        nama_mudir_arab: payload.template?.nama_mudir_arab?.trim() || "اسم المدير",
        jabatan_mudir_indo: payload.template?.jabatan_mudir_indo?.trim() || "Mudir Markaz Arabiyah",
        jabatan_mudir_arab: payload.template?.jabatan_mudir_arab?.trim() || "مدير مركز العربية",
      };

      if (existingTemplate) {
        await transaction.syahadahTemplate.update({
          where: { id: existingTemplate.id },
          data: templateData,
        });
      } else {
        await transaction.syahadahTemplate.create({
          data: templateData,
        });
      }
    });

    await syncStatusKelulusanByKelasIds(kelasUpdates.map((kelas) => kelas.id));

    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/master-data");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal memperbarui master data." }, { status: 500 });
  }
}
