import { createClient } from "@/lib/supabase/server";
import { StoryForm } from "@/components/admin/StoryForm";

export const dynamic = "force-dynamic";

export default async function NewStoryPage() {
  const supabase = await createClient();
  const { data: languages } = await supabase
    .from("languages")
    .select("id, name")
    .eq("status", "published")
    .order("created_at", { ascending: true });

  return <StoryForm languages={languages ?? []} />;
}
