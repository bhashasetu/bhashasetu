import Link from "next/link";
import { loadPageForEditor } from "@/lib/cms/load-page-for-editor";
import { PageContentEditor } from "@/components/admin/PageContentEditor";

export const dynamic = "force-dynamic";

/**
 * The editorial copy and fixed media of the Stories & Voices page — the hero
 * band, section headings and the student-team photographs. The interviews
 * and clips the page lists are records, managed at /admin/stories.
 *
 * Same editor as Homepage Content; only the slug differs.
 */
export default async function StoriesPageContent() {
  const page = await loadPageForEditor("stories-voices");

  if (!page) {
    return (
      <div className="admin-card">
        <h2>Stories &amp; Voices page not found</h2>
        <p className="admin-page-intro">
          No page with slug <code>stories-voices</code> exists yet. Run the
          migrations, then reload this screen.{" "}
          <Link href="/admin/stories">Back to stories</Link>.
        </p>
      </div>
    );
  }

  return (
    <PageContentEditor
      pageId={page.id}
      pageSlug={page.slug}
      pageTitle={page.title}
      pageStatus={page.status}
      heading="Stories & Voices Content"
      backHref="/admin/stories/content"
      sections={page.sections}
    />
  );
}
