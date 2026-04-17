import { ProjectsWorkbench } from "@/components/projects-workbench";
import { getProjectsWorkbenchData } from "@/lib/workbook";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const data = await getProjectsWorkbenchData();
  return <ProjectsWorkbench initialData={data.initial} summary={data.summary} lookups={data.lookups} />;
}
