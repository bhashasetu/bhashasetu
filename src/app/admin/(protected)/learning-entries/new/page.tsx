import { createClient } from "@/lib/supabase/server";
import { LearningEntryForm } from "@/components/admin/LearningEntryForm";

export const dynamic = "force-dynamic";

export default async function NewLearningEntryPage() {
  const supabase = await createClient();
  const [{ data: languages }, { data: categories }] = await Promise.all([
    supabase
      .from("languages")
      .select("id, name, code")
      .eq("status", "published")
      .order("created_at"),
    supabase
      .from("categories")
      .select("id, name, language_id")
      .neq("status", "archived")
      .order("display_order")
      .order("name"),
  ]);

  return (
    <LearningEntryForm languages={languages ?? []} categories={categories ?? []} />
  );
}
