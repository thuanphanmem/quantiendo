import { Workbench } from "@/components/workbench";
import { querySheet } from "@/lib/workbook";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const data = await querySheet("nhan-su");
  return (
    <Workbench
      title="Nhân sự"
      description="Danh sách nhân sự, bộ phận, vai trò, chi phí ngày và trạng thái làm việc."
      slug="nhan-su"
      initialData={data}
    />
  );
}
