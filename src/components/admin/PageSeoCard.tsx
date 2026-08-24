"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type PageSeo = {
  meta_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image_slot_id: string | null;
  noindex: boolean;
  page_summary: string | null;
};

/**
 * Search and social settings for one page (CLAUDE.md section 15).
 *
 * These sit with the page's copy rather than on the Advanced screen, because
 * this is where editors already are when they write the words a search
 * result will quote.
 *
 * Every field is optional and falls back sensibly: an empty search title
 * uses the page title, an empty search description uses the page
 * description. So an editor who ignores this card still gets correct tags.
 */
export function PageSeoCard({
  pageId,
  seo,
  slotOptions,
}: {
  pageId: string;
  seo: PageSeo;
  /** Media slots on this page, offered as the social-card image. */
  slotOptions: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<PageSeo>(seo);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(
    null
  );

  function set<K extends keyof PageSeo>(key: K, value: PageSeo[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/pages/${pageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meta_title: values.meta_title || null,
          meta_description: values.meta_description || null,
          canonical_url: values.canonical_url || null,
          og_title: values.og_title || null,
          og_description: values.og_description || null,
          og_image_slot_id: values.og_image_slot_id || null,
          noindex: values.noindex,
          page_summary: values.page_summary || null,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ kind: "error", text: body.error ?? "Could not save." });
        return;
      }
      setMessage({ kind: "ok", text: "Saved." });
      router.refresh();
    } catch {
      setMessage({ kind: "error", text: "Network error while saving." });
    } finally {
      setSaving(false);
    }
  }

  const text = (key: keyof PageSeo) => (values[key] as string | null) ?? "";

  return (
    <section className="admin-card hp-section">
      <header className="hp-section__head">
        <h3>Search &amp; sharing</h3>
        <button
          type="button"
          className="admin-btn admin-btn--ghost"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          {open ? "Hide" : "Edit"}
        </button>
      </header>

      {!open && (
        <p className="hp-row__hint">
          How this page appears in search results and when its link is shared.
          Left empty, the page&apos;s own title and description are used.
          {values.noindex && " Currently hidden from search."}
        </p>
      )}

      {open && (
        <>
          <div className="hp-fields">
            <Row label="Search title" htmlFor="seo-title">
              <input
                id="seo-title"
                type="text"
                value={text("meta_title")}
                onChange={(e) => set("meta_title", e.target.value)}
              />
              <p className="hp-row__hint">
                Around 60 characters. Falls back to the page title.
              </p>
            </Row>

            <Row label="Search description" htmlFor="seo-desc">
              <textarea
                id="seo-desc"
                rows={2}
                value={text("meta_description")}
                onChange={(e) => set("meta_description", e.target.value)}
              />
              <p className="hp-row__hint">
                Around 155 characters. Falls back to the page description.
              </p>
            </Row>

            <Row label="Page summary" htmlFor="seo-summary">
              <textarea
                id="seo-summary"
                rows={2}
                value={text("page_summary")}
                onChange={(e) => set("page_summary", e.target.value)}
              />
              <p className="hp-row__hint">
                A plain-language answer to &ldquo;what is this page?&rdquo;, used
                in structured data.
              </p>
            </Row>

            <Row label="Share title" htmlFor="seo-og-title">
              <input
                id="seo-og-title"
                type="text"
                value={text("og_title")}
                onChange={(e) => set("og_title", e.target.value)}
              />
            </Row>

            <Row label="Share description" htmlFor="seo-og-desc">
              <textarea
                id="seo-og-desc"
                rows={2}
                value={text("og_description")}
                onChange={(e) => set("og_description", e.target.value)}
              />
            </Row>

            <Row label="Share image" htmlFor="seo-og-image">
              <select
                id="seo-og-image"
                value={values.og_image_slot_id ?? ""}
                onChange={(e) => set("og_image_slot_id", e.target.value || null)}
              >
                <option value="">None</option>
                {slotOptions.map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    {slot.label}
                  </option>
                ))}
              </select>
              <p className="hp-row__hint">
                Picks one of this page&apos;s image slots, so replacing that
                image updates the shared card too.
              </p>
            </Row>

            <Row label="Canonical URL" htmlFor="seo-canonical">
              <input
                id="seo-canonical"
                type="url"
                value={text("canonical_url")}
                onChange={(e) => set("canonical_url", e.target.value)}
              />
              <p className="hp-row__hint">
                Only needed if this page duplicates another address.
              </p>
            </Row>

            <Row label="Hide from search" htmlFor="seo-noindex">
              <label className="hp-check">
                <input
                  id="seo-noindex"
                  type="checkbox"
                  checked={values.noindex}
                  onChange={(e) => set("noindex", e.target.checked)}
                />
                Keep this page out of search engines and the sitemap
              </label>
            </Row>
          </div>

          <div className="story-status__actions">
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save search settings"}
            </button>
          </div>

          {message && (
            <p
              role="status"
              className={
                message.kind === "ok" ? "hp-msg hp-msg--ok" : "hp-msg hp-msg--error"
              }
            >
              {message.text}
            </p>
          )}
        </>
      )}
    </section>
  );
}

function Row({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="hp-row">
      <label className="hp-row__label" htmlFor={htmlFor}>
        {label}
      </label>
      <div className="hp-row__control">{children}</div>
    </div>
  );
}
