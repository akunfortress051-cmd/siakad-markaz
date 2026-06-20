import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getBaseUrl } from "@/lib/base-url";
import { SyahadahOnlineEditor } from "@/components/syahadah-online-editor";
import { mergeOnlineLayout, OnlineLayoutData } from "@/lib/syahadah-online-layout";

export const dynamic = "force-dynamic";

export default async function CetakOnlinePage({
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

  const baseUrl = await getBaseUrl();
  const qrUrl = `${baseUrl}/ijazah/${id}`;

  const layout = mergeOnlineLayout(record.layoutData as Partial<OnlineLayoutData> | null);

  const data = {
    id: record.id,
    nama: record.nama,
    isMusyarokah: record.isMusyarokah,
    nilai: record.nilai,
    programOnline: record.programOnline
      ? {
          namaArab: record.programOnline.namaArab,
          tglCetakArab: record.programOnline.tglCetakArab,
          periodeAwal: record.programOnline.periodeAwal,
          periodeAkhir: record.programOnline.periodeAkhir,
        }
      : null,
  };

  return (
    <SyahadahOnlineEditor
      qrUrl={qrUrl}
      data={data}
      initialLayout={layout}
      recordId={id}
      backHref="/admin/syahadah-online"
      backLabel="← Kembali"
    />
  );
}
