import { MasterDataForm } from "@/components/admin/master-data-form";
import { getKelasCatalog, getTemplateData } from "@/lib/app-data";

export const dynamic = "force-dynamic";

export default async function MasterDataPage() {
  const [kelasList, template] = await Promise.all([getKelasCatalog(), getTemplateData()]);

  return <MasterDataForm kelasList={kelasList} template={template} />;
}
