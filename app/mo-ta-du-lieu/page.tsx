import { Workbench } from "@/components/workbench";
import { querySheet } from "@/lib/workbook";

export const dynamic = "force-dynamic";

export default async function DataDescriptionPage() {
  const data = await querySheet("mo-ta", { pageSize: 50 });
  return (
    <Workbench
      title="Mô tả dữ liệu"
      description="Bảng mô tả ý nghĩa các sheet và cách dùng dữ liệu trong hệ thống."
      slug="mo-ta"
      initialData={data}
    />
  );
}
