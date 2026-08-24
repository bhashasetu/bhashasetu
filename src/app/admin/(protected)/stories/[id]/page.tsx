import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StoryForm, type StoryRecord } from "@/components/admin/StoryForm";
import { StoryStatusControls } from "@/components/admin/StoryStatusControls";

export const dynamic = "force-dynamic";

export default async function EditStoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: story }, { data: languages }] = await Promise.all([
    supabase.from("stories").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("languages")
      .select("id, name")
      .eq("status", "published")
      .order("created_at", { ascending: true }),
  ]);

  if (!story) {
    return (
      <div className="admin-card">
        <h2>Story not found</h2>
        <p className="admin-page-intro">
          This story no longer exists. <Link href="/admin/stories">Back to the list</Link>.
        </p>
      </div>
    );
  }

  return (
    <>
      <StoryForm story={story as StoryRecord} languages={languages ?? []} />
      <StoryStatusControls
        storyId={story.id}
        status={story.status}
        consentConfirmed={story.consent_confirmed}
        hasRecording={!!story.media_asset_id}
      />
    </>
  );
}
