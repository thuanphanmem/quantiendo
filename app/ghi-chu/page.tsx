import { NotesWorkbench } from "@/components/notes-workbench";
import { getNotesWorkbenchData } from "@/lib/workbook";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const data = await getNotesWorkbenchData();
  return <NotesWorkbench initialData={data.initial} summary={data.summary} lookups={data.lookups} />;
}
