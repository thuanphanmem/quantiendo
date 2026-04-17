import { Workbench } from "@/components/workbench";
import { getSpacesWorkbenchData } from "@/lib/workbook";

export const dynamic = "force-dynamic";

export default async function SpacesPage() {
  const data = await getSpacesWorkbenchData();
  return (
    <Workbench
      title="Không gian và hạng mục"
      description="Theo dõi từng phòng/khu vực, trạng thái thiết kế, thi công, ngày chốt vật tư và tồn sau nghiệm thu."
      slug="hang-muc-khong-gian"
      initialData={data.initial}
      summaryCards={[
        { label: "Tổng không gian", value: data.summary.total, tone: "neutral" },
        { label: "Chờ thiết kế", value: data.summary.designPending, tone: "warning" },
        { label: "Chờ thi công", value: data.summary.constructionPending, tone: "warning" },
        { label: "Có tồn sau NT", value: data.summary.hasDefect, tone: "danger" },
      ]}
      spotlightTitle="Dự án có nhiều không gian cần theo dõi"
      spotlightItems={data.summary.topProjects.map((item) => ({
        title: item.name,
        meta: "Số không gian đang theo dõi",
        value: `${item.count} khu vực`,
      }))}
    />
  );
}
