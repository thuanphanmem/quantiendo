import { Workbench } from "@/components/workbench";
import { querySheet } from "@/lib/workbook";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const data = await querySheet("goi-dich-vu");
  return (
    <Workbench
      title="Gói dịch vụ"
      description="Danh mục gói dịch vụ, đơn vị tính, đơn giá mặc định và trạng thái áp dụng."
      slug="goi-dich-vu"
      initialData={data}
    />
  );
}
