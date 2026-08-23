import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LanguageForm } from "@/components/admin/LanguageForm";

export default async function EditLanguagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: language } = await supabase
    .from("languages")
    .select("*")
    .eq("id", id)
    .single();

  if (!language) notFound();

  return (
    <main>
      <h1>Edit Language: {language.name}</h1>
      <LanguageForm language={language} />
    </main>
  );
}
