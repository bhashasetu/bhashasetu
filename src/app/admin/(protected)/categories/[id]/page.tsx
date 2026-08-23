import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CategoryForm } from "@/components/admin/CategoryForm";

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: category }, { data: languages }] = await Promise.all([
    supabase.from("categories").select("*").eq("id", id).single(),
    supabase.from("languages").select("id, name, code").order("name"),
  ]);

  if (!category) notFound();

  return (
    <main>
      <h1>Edit Category: {category.name}</h1>
      <CategoryForm category={category} languages={languages ?? []} />
    </main>
  );
}
