import { Workbench } from "@/components/workbench";
import { getStagesWorkbenchData } from "@/lib/workbook";

export const dynamic = "force-dynamic";

export default async function StagesPage() {
  const data = await getStagesWorkbenchData();
  return (
    <Workbench
      title="Tiến độ giai đoạn"
      description="Theo dõi phase, timeline, phần trăm hoàn thành, người phụ trách và cảnh báo chậm tiến độ."
      slug="tien-do-giai-doan"
      initialData={data.initial}
      summaryCards={[
        { label: "Tổng giai đoạn", value: data.summary.total, tone: "neutral" },
        { label: "Đang chạy", value: data.summary.inProgress, tone: "primary" },
        { label: "Chậm tiến độ", value: data.summary.delayed, tone: "danger" },
        { label: "Hoàn thành", value: data.summary.completed, tone: "neutral" },
      ]}
      spotlightTitle="Người đang phụ trách nhiều giai đoạn"
      spotlightItems={data.summary.topOwners.map((item) => ({
        title: item.name,
        meta: "Số giai đoạn đang giữ",
        value: `${item.count} giai đoạn`,
      }))}
    />
  );
}
