import { createClient } from "@/lib/supabase/server";
import { LearningEntryForm } from "@/components/admin/LearningEntryForm";

export default async function NewLearningEntryPage() {
  const supabase = await createClient();
  const [{ data: languages }, { data: categories }] = await Promise.all([
    supabase.from("languages").select("id, name, code").order("name"),
    supabase.from("categories").select("id, name, language_id").order("name"),
  ]);

  return (
    <main>
      <h1>New Learning Entry</h1>
      <LearningEntryForm languages={languages ?? []} categories={categories ?? []} />
    </main>
  );
}
