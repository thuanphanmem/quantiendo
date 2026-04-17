import { PaymentsWorkbench } from "@/components/payments-workbench";
import { getPaymentsWorkbenchData } from "@/lib/workbook";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const data = await getPaymentsWorkbenchData();
  return <PaymentsWorkbench initialData={data.initial} summary={data.summary} lookups={data.lookups} />;
}
