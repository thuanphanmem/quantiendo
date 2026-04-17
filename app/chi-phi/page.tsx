import { Workbench } from "@/components/workbench";
import { compactCurrency } from "@/lib/utils";
import { getCostsWorkbenchData } from "@/lib/workbook";

export const dynamic = "force-dynamic";

export default async function CostsPage() {
  const data = await getCostsWorkbenchData();
  return (
    <Workbench
      title="Chi phí"
      description="Theo dõi chi phí thực tế, trạng thái duyệt chi, nhà cung cấp và các khoản phát sinh."
      slug="chi-phi"
      initialData={data.initial}
      summaryCards={[
        { label: "Tổng dòng chi", value: data.summary.total, tone: "neutral" },
        { label: "Tổng chi", value: compactCurrency(data.summary.totalAmount), tone: "primary" },
        { label: "Khoản phát sinh", value: data.summary.generated, tone: "warning" },
      ]}
      spotlightTitle="Nhóm chi nổi bật"
      spotlightItems={data.summary.topCategories.map((item) => ({
        title: item.name,
        meta: "Nhóm chi đang chiếm tỷ trọng cao",
        value: compactCurrency(item.amount),
      }))}
    />
  );
}
