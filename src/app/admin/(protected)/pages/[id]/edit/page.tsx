import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageEditForm } from "@/components/admin/PageEditForm";
import { SectionsList } from "@/components/admin/SectionsList";

export default async function EditPagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: page, error: pageError } = await supabase
    .from("pages")
    .select(
      `
      *,
      page_sections(
        *,
        media_slots(
          *,
          generation_prompts(*),
          slot_media_assignments(
            *,
            media_asset:media_assets(*)
          )
        ),
        page_content(*)
      )
      `
    )
    .eq("id", id)
    .single();

  if (pageError || !page) notFound();

  return (
    <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
      <h1>Edit Page: {page.title}</h1>

      {/* Page Metadata Form */}
      <PageEditForm pageId={id} initialData={page} />

      {/* Sections Overview */}
      {page.page_sections && page.page_sections.length > 0 && (
        <SectionsList pageId={id} sections={page.page_sections} />
      )}

      <p style={{ marginTop: "20px" }}>
        <Link href="/admin/pages">← Back to pages</Link>
      </p>
    </main>
  );
}
