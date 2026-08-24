"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageMediaRow } from "./PageMediaRow";
import {
  fieldRank,
  isLongField,
  labelFor,
  supportsAccent,
  surfaceFor,
} from "@/lib/cms/page-editor-config";

export type ContentField = {
  id: string;
  field_key: string;
  content: string | null;
  field_type: string;
  status: string | null;
};

export type MediaSlot = {
  id: string;
  slot_key: string;
  media_type: string;
  aspect_ratio: string | null;
  status: string | null;
  slot_media_assignments?:
    | {
        status: string | null;
        created_at?: string | null;
        media_asset?: { id: string; filename: string; title?: string | null } | null;
      }[]
    | null;
  generation_prompts?: { provider: string; model_name: string | null }[] | null;
};

export type Section = {
  id: string;
  section_key: string;
  title: string | null;
  section_type: string;
  display_order: number | null;
  status: string | null;
  page_content: ContentField[] | null;
  media_slots: MediaSlot[] | null;
};

export function PageContentEditor({
  pageId,
  pageSlug,
  pageTitle,
  pageStatus,
  heading,
  backHref,
  sections,
}: {
  pageId: string;
  /** Selects this page's surface labels; see SURFACE_BY_PAGE. */
  pageSlug: string;
  pageTitle: string;
  pageStatus: string;
  /** Screen heading, e.g. "Homepage Content". */
  heading: string;
  /** Where the slot detail screen returns to. */
  backHref: string;
  sections: Section[];
}) {
  const loaded = useMemo(() => {
    const map: Record<string, string> = {};
    for (const section of sections) {
      for (const field of section.page_content ?? []) {
        map[field.id] = field.content ?? "";
      }
    }
    return map;
  }, [sections]);

  const [values, setValues] = useState<Record<string, string>>(loaded);
  // What is currently persisted. Advances on a successful save so the dirty
  // set clears without a full reload.
  const [baseline, setBaseline] = useState<Record<string, string>>(loaded);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<
    { kind: "ok" | "error"; text: string } | null
  >(null);

  const dirtyIds = Object.keys(values).filter((id) => values[id] !== baseline[id]);
  const dirty = dirtyIds.length > 0;

  const router = useRouter();

  // A media row saves itself (it's a file upload, not a text field the top
  // bar batches), then announces success so the section list — read
  // straight from the sections prop — refreshes with the new attachment.
  useEffect(() => {
    const onMediaSaved = () => router.refresh();
    window.addEventListener("page-media-saved", onMediaSaved);
    return () => window.removeEventListener("page-media-saved", onMediaSaved);
  }, [router]);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/page-content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: dirtyIds.map((id) => ({ id, content: values[id] })),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ kind: "error", text: body.error ?? "Could not save." });
        return;
      }
      setMessage({
        kind: "ok",
        text: `Saved ${body.saved} field${body.saved === 1 ? "" : "s"}.`,
      });
      setBaseline({ ...baseline, ...Object.fromEntries(dirtyIds.map((id) => [id, values[id]])) });
    } catch {
      setMessage({ kind: "error", text: "Network error while saving." });
    } finally {
      setSaving(false);
    }
  }

  const ordered = [...sections].sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
  );

  return (
    <div className="hp-editor">
      {/* Sticky so Save is reachable from anywhere on a long page. */}
      <div className="hp-bar">
        <div className="hp-bar__text">
          <h2 className="hp-bar__title">{heading}</h2>
          <p className="hp-bar__sub">
            {pageTitle}
            <span className={`admin-pill admin-pill--${pageStatus}`}>
              {pageStatus}
            </span>
          </p>
        </div>
        <div className="hp-bar__actions">
          {dirty && <span className="hp-bar__dirty">{dirtyIds.length} unsaved</span>}
          <Link
            href={`/admin/pages/${pageId}`}
            className="admin-btn admin-btn--ghost"
          >
            Advanced
          </Link>
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            onClick={handleSave}
            disabled={!dirty || saving}
          >
            {saving ? "Saving\u2026" : "Save changes"}
          </button>
        </div>
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

      {/* Jump list: the page is long, so give it a spine. */}
      <nav className="hp-jump" aria-label="Sections">
        {ordered.map((section) => (
          <a key={section.id} href={`#sec-${section.section_key}`}>
            {section.title || section.section_key}
          </a>
        ))}
      </nav>

      {ordered.map((section) => {
        const fields = [...(section.page_content ?? [])].sort(
          (a, b) =>
            fieldRank(a.field_key) - fieldRank(b.field_key) ||
            a.field_key.localeCompare(b.field_key)
        );
        const slots = [...(section.media_slots ?? [])].sort(
          (a, b) => (a.slot_key > b.slot_key ? 1 : -1)
        );
        const surface = surfaceFor(pageSlug, section.section_key);

        return (
          <section
            className="admin-card hp-section"
            id={`sec-${section.section_key}`}
            key={section.id}
          >
            <header className="hp-section__head">
              <h3>{section.title || section.section_key}</h3>
              <span
                className={`admin-pill admin-pill--surface-${surface.toLowerCase()}`}
                title={`Appears on: ${surface}`}
              >
                {surface}
              </span>
            </header>

            {fields.length > 0 && (
              <div className="hp-fields">
                {fields.map((field) => (
                  <div className="hp-row" key={field.id}>
                    <label
                      className="hp-row__label"
                      htmlFor={`f-${field.id}`}
                      title={field.field_key}
                    >
                      {labelFor(field.field_key)}
                    </label>
                    <div className="hp-row__control">
                      {isLongField(field.field_key) ? (
                        <textarea
                          id={`f-${field.id}`}
                          rows={2}
                          value={values[field.id] ?? ""}
                          onChange={(e) =>
                            setValues({ ...values, [field.id]: e.target.value })
                          }
                        />
                      ) : (
                        <input
                          id={`f-${field.id}`}
                          type="text"
                          value={values[field.id] ?? ""}
                          onChange={(e) =>
                            setValues({ ...values, [field.id]: e.target.value })
                          }
                        />
                      )}
                      {supportsAccent(field.field_key) && (
                        <p className="hp-row__hint">
                          Wrap a word in *asterisks* to show it in the accent
                          gold, as the approved design does.
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {slots.length > 0 && (
              <div className="hp-slots">
                <h4 className="hp-slots__title">Media</h4>
                <div className="hp-media-list">
                  {slots.map((slot) => (
                    <PageMediaRow
                      key={slot.id}
                      pageId={pageId}
                      slot={slot}
                      label={labelFor(slot.slot_key)}
                      backHref={backHref}
                    />
                  ))}
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
