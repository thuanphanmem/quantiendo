import { DashboardPage } from "@/components/dashboard-page";
import { getDashboardData } from "@/lib/workbook";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await getDashboardData();
  return <DashboardPage data={data} />;
}
