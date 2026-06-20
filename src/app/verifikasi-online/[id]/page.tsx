import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { VerifikasiClient } from "./verifikasi-client";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Verifikasi Syahadah Online",
};

export default async function VerifikasiOnlinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  const record = await prisma.syahadahOnline.findUnique({
    where: { id },
    include: { programOnline: true },
  });

  if (!record) {
    notFound();
  }

  const template = await prisma.syahadahTemplate.findFirst({
    orderBy: { id: "asc" }
  });

  const clientData = {
    nama: record.nama,
    program_indo: record.programOnline?.namaIndo || "Program Musyarokah",
    periodeAwal: record.programOnline?.periodeAwalIndo || "........",
    periodeAkhir: record.programOnline?.periodeAkhirIndo || "........",
    nilai: record.nilai,
    isMusyarokah: record.isMusyarokah,
    template: {
      tgl_cetak_indo: template?.tgl_cetak_indo || "........",
      jabatan_mudir_indo: template?.jabatan_mudir_indo || "Mudir Markaz Arabiyah",
      nama_mudir_indo: template?.nama_mudir_indo || "Nama Mudir",
    }
  };

  return <VerifikasiClient data={clientData} />;
}
