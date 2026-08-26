import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FaqForm } from "@/components/admin/FaqForm";
import { FAQ_COLUMNS, type FaqRow } from "@/lib/faq/queries";

export const dynamic = "force-dynamic";

export default async function EditFaqPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data, error }, { data: aliases }] = await Promise.all([
    supabase.from("chat_faqs").select(FAQ_COLUMNS).eq("id", id).single(),
    supabase
      .from("chat_faq_aliases")
      .select("id, locale, alias")
      .eq("faq_id", id)
      .order("locale", { ascending: true })
      .order("alias", { ascending: true }),
  ]);

  if (error || !data) notFound();
  const faq = data as unknown as FaqRow;

  return (
    <FaqForm
      initial={{
        id: faq.id,
        slug: faq.slug,
        category: faq.category,
        display_order: faq.display_order,
        status: faq.status,
        question_en: faq.question_en,
        answer_en: faq.answer_en,
        question_hi: faq.question_hi ?? "",
        answer_hi: faq.answer_hi ?? "",
        question_mr: faq.question_mr ?? "",
        answer_mr: faq.answer_mr ?? "",
      }}
      aliases={aliases ?? []}
    />
  );
}
