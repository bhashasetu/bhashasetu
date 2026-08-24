import { loadPageForEditor } from "@/lib/cms/load-page-for-editor";
import { PageContentEditor } from "@/components/admin/PageContentEditor";

export const dynamic = "force-dynamic";

/**
 * Homepage Content module (CLAUDE.md section 13).
 * One screen manages the editorial copy and media slots for both the desktop
 * homepage and the mobile home screen, which share a single `homepage` record.
 */
export default async function HomepageContentPage() {
  const page = await loadPageForEditor("homepage");

  if (!page) {
    return (
      <div className="admin-card">
        <h2>Homepage not found</h2>
        <p className="admin-page-intro">
          No page with slug <code>homepage</code> exists yet. Run the homepage
          migrations, then reload this screen.
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
      heading="Homepage Content"
      seo={page.seo}
      backHref="/admin/homepage"
      sections={page.sections}
    />
  );
}
