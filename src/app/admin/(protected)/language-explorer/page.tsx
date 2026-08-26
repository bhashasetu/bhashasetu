import { loadPageForEditor } from "@/lib/cms/load-page-for-editor";
import { PageContentEditor } from "@/components/admin/PageContentEditor";

export const dynamic = "force-dynamic";

/**
 * Language Explorer content module (CLAUDE.md section 13).
 *
 * The editorial copy and artwork for WEB-04 and MOBILE-01 — the heading, the
 * search hint and its example terms, the featured searches, the suggest-a-word
 * panel and the verification promise in both the desktop band and the mobile
 * robot card.
 *
 * What is NOT here, deliberately: the words themselves. Those are learning
 * entries, managed in Words & Phrases with their verification workflow, and
 * the featured ones are chosen with the checkbox on each entry. This screen
 * governs the page around them, not the language content in it.
 */
export default async function LanguageExplorerContentPage() {
  const page = await loadPageForEditor("language-explorer");

  if (!page) {
    return (
      <div className="admin-card">
        <h2>Language Explorer page not found</h2>
        <p className="admin-page-intro">
          No page with slug <code>language-explorer</code> exists yet. Run
          migration <code>0029_language_explorer.sql</code>, then reload this
          screen.
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
      heading="Language Explorer Content"
      seo={page.seo}
      backHref="/admin/language-explorer"
      sections={page.sections}
    />
  );
}
