/* eslint-disable @next/next/no-img-element */
import { getCertificateData } from "@/lib/app-data";
import { notFound } from "next/navigation";
import { IjazahClient } from "./ijazah-client";

export const dynamic = "force-dynamic";

export default async function IjazahPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getCertificateData(id);

  if (!data) {
    notFound();
  }

  // Serialise only the fields the client needs (no Date objects)
  const clientData = {
    masterSantri: {
      nama: data.masterSantri.nama,
      dufahNama: data.masterSantri.dufahNama,
    },
    santriInternal: {
      tempat_lahir: (data.santriInternal as any)?.tempat_lahir ?? "",
      tanggal_lahir: (data.santriInternal as any)?.tanggal_lahir ?? "",
      alamat: (data.santriInternal as any)?.alamat ?? "",
    },
    program: { nama_indo: data.program.nama_indo },
    template: {
      tgl_cetak_indo: data.template.tgl_cetak_indo,
      jabatan_mudir_indo: data.template.jabatan_mudir_indo,
      nama_mudir_indo: data.template.nama_mudir_indo,
      tgl_mulai_indo: data.template.tgl_mulai_indo ?? null,
      tgl_selesai_indo: data.template.tgl_selesai_indo ?? null,
    },
    nilaiRows: data.nilaiRows.map((r) => ({
      mapelId: r.mapelId,
      nama_indo: r.nama_indo,
      skor: r.skor ?? null,
    })),
    average: data.average,
    averagePredikat: { indo: data.averagePredikat.indo },
    status: data.status,
    isTurats: (data.program as any)?.kategori === "TURATS",
  };

  return <IjazahClient data={clientData} />;
}
