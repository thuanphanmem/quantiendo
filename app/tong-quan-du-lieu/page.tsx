import { Workbench } from "@/components/workbench";
import { querySheet } from "@/lib/workbook";

export const dynamic = "force-dynamic";

export default async function SummaryDataPage() {
  const data = await querySheet("tong-quan", { pageSize: 50 });
  return (
    <Workbench
      title="Tổng quan dữ liệu"
      description="Các chỉ số tổng hợp lấy trực tiếp từ sheet tổng quan trong workbook."
      slug="tong-quan"
      initialData={data}
    />
  );
}
