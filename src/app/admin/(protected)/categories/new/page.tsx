import { createClient } from "@/lib/supabase/server";
import { CategoryForm } from "@/components/admin/CategoryForm";

export default async function NewCategoryPage() {
  const supabase = await createClient();
  const { data: languages } = await supabase
    .from("languages")
    .select("id, name, code")
    .order("name");

  return (
    <main>
      <h1>New Category</h1>
      <CategoryForm languages={languages ?? []} />
    </main>
  );
}
