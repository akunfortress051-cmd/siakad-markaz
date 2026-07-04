import { getCertificateData } from "@/lib/app-data";
import { getBaseUrl } from "@/lib/base-url";
import { notFound } from "next/navigation";
import { SyahadahEditor } from "@/components/syahadah-editor";
import { getMartabahLayout } from "@/lib/syahadah-layout";

export const dynamic = "force-dynamic";

export default async function CetakMartabahPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getCertificateData(id);

  if (!data) {
    notFound();
  }

  const baseUrl = await getBaseUrl();
  const qrUrl = `${baseUrl}/ijazah/${id}`;

  const riwayatId = data.riwayatSantri?.id ?? null;
  const programId = data.program?.id ?? null;
  const isTurats = (data.program as any)?.kategori === "TURATS";

  const layout = await getMartabahLayout(isTurats);

  return (
    <SyahadahEditor
      qrUrl={qrUrl}
      data={data as any}
      initialLayout={layout}
      riwayatId={riwayatId}
      programId={programId}
      mode="per-santri"
      isMartabah={true}
      backHref="/admin/martabah-ula"
      backLabel="← Kembali ke Martabah Ula"
      titleLabel="Layout Editor — Sertifikat Penghargaan"
      isTurats={isTurats}
    />
  );
}
