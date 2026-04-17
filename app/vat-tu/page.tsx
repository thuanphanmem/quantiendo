import { MaterialsWorkbench } from "@/components/materials-workbench";
import { getMaterialsWorkbenchData } from "@/lib/workbook";

export const dynamic = "force-dynamic";

export default async function MaterialsPage() {
  const data = await getMaterialsWorkbenchData();
  return <MaterialsWorkbench initialData={data.initial} summary={data.summary} lookups={data.lookups} />;
}
