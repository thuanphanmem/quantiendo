import { Workbench } from "@/components/workbench";
import { querySheet } from "@/lib/workbook";

export const dynamic = "force-dynamic";

export default async function AcceptancePage() {
  const data = await querySheet("nghiem-thu-ban-giao");
  return (
    <Workbench
      title="Nghiệm thu và bàn giao"
      description="Theo dõi các lần nghiệm thu, kết quả, tồn sau nghiệm thu và tiến độ xử lý tồn."
      slug="nghiem-thu-ban-giao"
      initialData={data}
    />
  );
}
