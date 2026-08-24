"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type ContentField = {
  id: string;
  field_key: string;
  content: string | null;
  field_type: string;
  status: string | null;
};

type MediaSlot = {
  id: string;
  slot_key: string;
  media_type: string;
  aspect_ratio: string | null;
  status: string | null;
  slot_media_assignments?: { status: string | null }[] | null;
  generation_prompts?: { provider: string; model_name: string | null }[] | null;
};

type Section = {
  id: string;
  section_key: string;
  title: string | null;
  section_type: string;
  display_order: number | null;
  status: string | null;
  page_content: ContentField[] | null;
  media_slots: MediaSlot[] | null;
};

/**
 * Which surface each section appears on, so an editor can tell at a glance
 * whether a change affects the desktop site, the mobile app, or both.
 */
const SURFACE: Record<string, "Desktop" | "Mobile" | "Both"> = {
  hero: "Desktop",
  wro_project: "Both",
  learn_explore: "Both",
  voices_inspire: "Desktop",
  my_bhasha_setu: "Both",
  mobile_hero: "Mobile",
  todays_word: "Mobile",
  stories_voices: "Mobile",
};

/** Human labels for field keys; unknown keys fall back to a de-slugged form. */
const FIELD_LABELS: Record<string, string> = {
  heading: "Heading",
  description: "Description",
  title: "Title",
  cta_text: "Call-to-action label",
  greeting: "Greeting",
  label: "Label",
  native_text: "Native text (Warli / Katkari)",
  english_meaning: "English meaning",
  hindi_meaning: "Hindi meaning",
};

function labelFor(key: string) {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  return key
    .replace(/_/g, " ")
    .replace(/\b(\w)/g, (m) => m.toUpperCase())
    .replace(/\bCta\b/, "CTA");
}

/** Reading order for a section's fields; anything unlisted follows, sorted. */
const FIELD_ORDER = [
  "greeting",
  "label",
  "title",
  "heading",
  "description",
  "native_text",
  "english_meaning",
  "hindi_meaning",
  "cta_text",
];

function fieldRank(key: string) {
  const i = FIELD_ORDER.indexOf(key);
  return i === -1 ? FIELD_ORDER.length : i;
}

function isLongField(key: string) {
  return key === "description" || key.endsWith("_description");
}

export function HomepageContentEditor({
  pageId,
  pageTitle,
  pageStatus,
  sections,
}: {
  pageId: string;
  pageTitle: string;
  pageStatus: string;
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
      <div className="hp-editor__bar">
        <div>
          <h2 className="hp-editor__title">{pageTitle}</h2>
          <p className="admin-page-intro">
            Editorial copy and media slots for the public homepage. Sections are
            marked by the surface they appear on.
          </p>
        </div>
        <div className="hp-editor__actions">
          <span className={`admin-pill admin-pill--${pageStatus}`}>
            {pageStatus}
          </span>
          <Link
            href={`/admin/pages/${pageId}`}
            className="admin-btn admin-btn--ghost"
          >
            Section detail
          </Link>
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            onClick={handleSave}
            disabled={!dirty || saving}
          >
            {saving ? "Saving…" : dirty ? `Save ${dirtyIds.length} change${dirtyIds.length === 1 ? "" : "s"}` : "Saved"}
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

      {ordered.map((section) => {
        const fields = [...(section.page_content ?? [])].sort(
          (a, b) =>
            fieldRank(a.field_key) - fieldRank(b.field_key) ||
            a.field_key.localeCompare(b.field_key)
        );
        const slots = [...(section.media_slots ?? [])].sort((a, b) =>
          a.slot_key.localeCompare(b.slot_key)
        );
        const surface = SURFACE[section.section_key] ?? "Both";

        return (
          <section className="admin-card hp-section" key={section.id}>
            <header className="hp-section__head">
              <h3>{section.title || section.section_key}</h3>
              <div className="hp-section__tags">
                <span className={`admin-pill admin-pill--surface-${surface.toLowerCase()}`}>
                  {surface}
                </span>
                <code className="hp-key">{section.section_key}</code>
              </div>
            </header>

            {fields.length > 0 && (
              <div className="hp-fields">
                {fields.map((field) => (
                  <label className="hp-field" key={field.id}>
                    <span className="hp-field__label">
                      {labelFor(field.field_key)}
                    </span>
                    {isLongField(field.field_key) ? (
                      <textarea
                        rows={3}
                        value={values[field.id] ?? ""}
                        onChange={(e) =>
                          setValues({ ...values, [field.id]: e.target.value })
                        }
                      />
                    ) : (
                      <input
                        type="text"
                        value={values[field.id] ?? ""}
                        onChange={(e) =>
                          setValues({ ...values, [field.id]: e.target.value })
                        }
                      />
                    )}
                    <span className="hp-field__key">{field.field_key}</span>
                  </label>
                ))}
              </div>
            )}

            {slots.length > 0 && (
              <div className="hp-slots">
                <h4 className="hp-slots__title">Media slots</h4>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Slot</th>
                      <th>Type</th>
                      <th>Ratio</th>
                      <th>Asset</th>
                      <th>Source</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {slots.map((slot) => {
                      const assigned = (slot.slot_media_assignments ?? []).length > 0;
                      const prompt = slot.generation_prompts?.[0];
                      return (
                        <tr key={slot.id}>
                          <td>
                            <code className="hp-key">{slot.slot_key}</code>
                          </td>
                          <td>{slot.media_type}</td>
                          <td>{slot.aspect_ratio ?? "—"}</td>
                          <td>
                            <span
                              className={
                                assigned
                                  ? "admin-pill admin-pill--published"
                                  : "admin-pill admin-pill--draft"
                              }
                            >
                              {assigned ? "Attached" : "Empty"}
                            </span>
                          </td>
                          <td>
                            {prompt
                              ? prompt.provider === "manual"
                                ? "Canonical asset"
                                : `${prompt.provider} / ${prompt.model_name ?? "—"}`
                              : "Upload only"}
                          </td>
                          <td className="hp-slots__action">
                            <Link
                              href={`/admin/pages/${pageId}/slots/${slot.id}`}
                              className="admin-btn admin-btn--ghost"
                            >
                              Manage
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
