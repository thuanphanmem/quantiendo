import { TasksWorkbench } from "@/components/tasks-workbench";
import { getTasksWorkbenchData } from "@/lib/workbook";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const data = await getTasksWorkbenchData();
  return <TasksWorkbench initialData={data.initial} summary={data.summary} lookups={data.lookups} />;
}
