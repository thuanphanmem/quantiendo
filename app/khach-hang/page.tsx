import { Workbench } from "@/components/workbench";
import { querySheet } from "@/lib/workbook";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const data = await querySheet("khach-hang");
  return (
    <Workbench
      title="Khách hàng"
      description="Danh sách khách hàng, đầu mối liên hệ và nguồn khách."
      slug="khach-hang"
      initialData={data}
    />
  );
}
