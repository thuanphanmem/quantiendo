import { notFound } from "next/navigation";

import { ProjectDetailPage } from "@/components/project-detail-page";
import { getProjectDetail } from "@/lib/workbook";

export const dynamic = "force-dynamic";

export default async function ProjectDetailRoute({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const data = await getProjectDetail(projectId);
  if (!data) notFound();
  return <ProjectDetailPage data={data} />;
}
