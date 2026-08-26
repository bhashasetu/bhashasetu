"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaqAliasEditor } from "./FaqAliasEditor";
import {
  faqCategoryValues,
  faqLocaleValues,
} from "@/lib/validation/schemas";
import { CATEGORY_LABELS } from "@/lib/faq/queries";

export type FaqFormValues = {
  id?: string;
  slug: string;
  category: string;
  display_order: number;
  status: string;
  question_en: string;
  answer_en: string;
  question_hi: string;
  answer_hi: string;
  question_mr: string;
  answer_mr: string;
};

const LOCALE_LABELS: Record<string, string> = {
  en: "English",
  hi: "हिन्दी — Hindi",
  mr: "मराठी — Marathi",
};

/**
 * Roughly how long an answer should be.
 *
 * Not a hard limit — the schema allows far more — but every answer is read
 * aloud by the assistant, and a long paragraph makes a long, dull clip. The
 * counter turns amber past this so an editor can see it happening.
 */
const TARGET_WORDS = 60;

function wordCount(text: string) {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/**
 * One help question in three languages.
 *
 * The three locales sit side by side rather than behind tabs so an editor can
 * see at a glance which are still missing — a Hindi answer left blank is not a
 * bug, it just falls back to English on the public side, and being able to spot
 * the gap is the point.
 */
export function FaqForm({
  initial,
  aliases,
}: {
  initial: FaqFormValues;
  /** Existing phrasings; only present once the question has been saved. */
  aliases?: { id: string; locale: string; alias: string }[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<FaqFormValues>(initial);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isNew = !initial.id;

  function set<K extends keyof FaqFormValues>(key: K, value: FaqFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setNotice(null);
    setError(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setNotice(null);

    const payload = {
      slug: values.slug,
      category: values.category,
      display_order: Number(values.display_order) || 0,
      question_en: values.question_en,
      answer_en: values.answer_en,
      question_hi: values.question_hi || null,
      answer_hi: values.answer_hi || null,
      question_mr: values.question_mr || null,
      answer_mr: values.answer_mr || null,
    };

    try {
      const res = await fetch(
        isNew ? "/api/admin/faqs" : `/api/admin/faqs/${initial.id}`,
        {
          method: isNew ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(body.error ?? `Could not save (${res.status})`);
        return;
      }

      if (isNew) {
        router.push(`/admin/faqs/${body.data.id}`);
        return;
      }
      setNotice("Saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(status: string) {
    if (!initial.id) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/faqs/${initial.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? `Could not update status (${res.status})`);
        return;
      }
      setValues((v) => ({ ...v, status }));
      setNotice(status === "published" ? "Published." : `Moved to ${status}.`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="hp-editor">
      <div className="hp-bar">
        <div className="hp-bar__text">
          <h2 className="hp-bar__title">
            {isNew ? "New question" : values.question_en || "Question"}
          </h2>
          <p className="hp-bar__sub">
            Answers the assistant gives, and the /faq page shows. Both read this
            same record.
          </p>
        </div>
        <div className="hp-bar__actions">
          <Link href="/admin/faqs" className="admin-btn admin-btn--ghost">
            Back
          </Link>
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="hp-msg hp-msg--error">
          {error}
        </p>
      )}
      {notice && <p className="hp-msg hp-msg--ok">{notice}</p>}

      <section className="admin-card hp-section">
        <header className="hp-section__head">
          <h3>Where it sits</h3>
          {!isNew && (
            <span
              className={
                values.status === "published"
                  ? "admin-pill admin-pill--published"
                  : "admin-pill admin-pill--draft"
              }
            >
              {values.status}
            </span>
          )}
        </header>

        <div className="hp-fields">
          <div className="hp-row">
            <label className="hp-row__label" htmlFor="faq-slug">
              Reference
            </label>
            <div className="hp-row__control">
              <input
                id="faq-slug"
                type="text"
                value={values.slug}
                onChange={(e) => set("slug", e.target.value)}
                placeholder="is-it-free"
              />
              <p className="hp-row__hint">
                A stable name for this question, in lowercase with hyphens. It
                never changes once other things point at it.
              </p>
            </div>
          </div>

          <div className="hp-row">
            <label className="hp-row__label" htmlFor="faq-category">
              Group
            </label>
            <div className="hp-row__control">
              <select
                id="faq-category"
                value={values.category}
                onChange={(e) => set("category", e.target.value)}
              >
                {faqCategoryValues.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c] ?? c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="hp-row">
            <label className="hp-row__label" htmlFor="faq-order">
              Order
            </label>
            <div className="hp-row__control">
              <input
                id="faq-order"
                type="number"
                value={values.display_order}
                onChange={(e) => set("display_order", Number(e.target.value))}
              />
              <p className="hp-row__hint">
                Lower numbers come first, on both the FAQ page and in the
                assistant&apos;s suggestions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {faqLocaleValues.map((locale) => {
        const qKey = `question_${locale}` as keyof FaqFormValues;
        const aKey = `answer_${locale}` as keyof FaqFormValues;
        const answer = String(values[aKey] ?? "");
        const words = wordCount(answer);
        const missing = locale !== "en" && !answer.trim();

        return (
          <section className="admin-card hp-section" key={locale}>
            <header className="hp-section__head">
              <h3>{LOCALE_LABELS[locale]}</h3>
              {locale === "en" ? (
                <span className="admin-pill admin-pill--published">Required</span>
              ) : missing ? (
                <span className="admin-pill admin-pill--draft">
                  Not written — falls back to English
                </span>
              ) : (
                <span className="admin-pill admin-pill--published">Written</span>
              )}
            </header>

            <div className="hp-fields">
              <div className="hp-row">
                <label className="hp-row__label" htmlFor={`q-${locale}`}>
                  Question
                </label>
                <div className="hp-row__control">
                  <input
                    id={`q-${locale}`}
                    type="text"
                    value={String(values[qKey] ?? "")}
                    onChange={(e) => set(qKey, e.target.value as never)}
                  />
                </div>
              </div>

              <div className="hp-row">
                <label className="hp-row__label" htmlFor={`a-${locale}`}>
                  Answer
                </label>
                <div className="hp-row__control">
                  <textarea
                    id={`a-${locale}`}
                    rows={4}
                    value={answer}
                    onChange={(e) => set(aKey, e.target.value as never)}
                  />
                  <p
                    className={
                      words > TARGET_WORDS
                        ? "hp-row__hint hp-row__hint--warn"
                        : "hp-row__hint"
                    }
                  >
                    {words} words
                    {words > TARGET_WORDS
                      ? ` — longer than about ${TARGET_WORDS} makes a slow spoken clip.`
                      : ""}
                  </p>
                </div>
              </div>
            </div>
          </section>
        );
      })}

      {!isNew && initial.id && (
        <FaqAliasEditor faqId={initial.id} initial={aliases ?? []} />
      )}

      {!isNew && (
        <section className="admin-card hp-section">
          <header className="hp-section__head">
            <h3>Publishing</h3>
          </header>
          <p className="admin-page-intro">
            A published answer is shown to visitors on the FAQ page and given by
            the assistant. Archiving hides it from both without deleting it.
          </p>
          <div className="hp-bar__actions">
            {values.status !== "published" && (
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                onClick={() => changeStatus("published")}
                disabled={saving}
              >
                Publish
              </button>
            )}
            {values.status === "published" && (
              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                onClick={() => changeStatus("draft")}
                disabled={saving}
              >
                Unpublish
              </button>
            )}
            {values.status !== "archived" && (
              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                onClick={() => changeStatus("archived")}
                disabled={saving}
              >
                Archive
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
