"use client";

import { useState } from "react";
import { faqLocaleValues } from "@/lib/validation/schemas";

type Alias = { id: string; locale: string; alias: string };

const LOCALE_LABELS: Record<string, string> = {
  en: "English",
  hi: "हिन्दी",
  mr: "मराठी",
};

/**
 * The other ways people ask this question.
 *
 * This is the whole reason the assistant can answer without a language model:
 * "is it free", "how much does it cost" and "do I have to pay" are one
 * question, and matching them is a database lookup rather than a paid call on
 * every message. Adding one takes a couple of seconds, which matters, because
 * the list only stays good if editors add phrasings as they see real people
 * type them.
 */
export function FaqAliasEditor({
  faqId,
  initial,
}: {
  faqId: string;
  initial: Alias[];
}) {
  const [aliases, setAliases] = useState<Alias[]>(initial);
  const [locale, setLocale] = useState<string>("en");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    const alias = text.trim();
    if (!alias) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/faqs/${faqId}/aliases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, alias }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? `Could not add (${res.status})`);
        return;
      }
      setAliases((list) => [...list, body.data]);
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add");
    } finally {
      setBusy(false);
    }
  }

  async function remove(aliasId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/faqs/${faqId}/aliases?alias_id=${encodeURIComponent(aliasId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `Could not remove (${res.status})`);
        return;
      }
      setAliases((list) => list.filter((a) => a.id !== aliasId));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-card hp-section">
      <header className="hp-section__head">
        <h3>Other ways people ask this</h3>
        <span className="admin-pill admin-pill--draft">{aliases.length}</span>
      </header>

      <p className="admin-page-intro">
        The assistant matches a visitor&apos;s question against these as well as
        the question above. The more real phrasings listed, the more often it
        answers without guessing.
      </p>

      {error && (
        <p role="alert" className="hp-msg hp-msg--error">
          {error}
        </p>
      )}

      <div className="faq-alias__add">
        <label className="visually-hidden" htmlFor="alias-locale">
          Language
        </label>
        <select
          id="alias-locale"
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
        >
          {faqLocaleValues.map((l) => (
            <option key={l} value={l}>
              {LOCALE_LABELS[l]}
            </option>
          ))}
        </select>
        <label className="visually-hidden" htmlFor="alias-text">
          Phrasing
        </label>
        <input
          id="alias-text"
          type="text"
          value={text}
          placeholder="how much does it cost"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void add();
            }
          }}
        />
        <button
          type="button"
          className="admin-btn admin-btn--ghost"
          onClick={add}
          disabled={busy || !text.trim()}
        >
          Add
        </button>
      </div>

      {aliases.length === 0 ? (
        <p className="admin-page-intro">
          None yet. Without any, only the exact question above will match.
        </p>
      ) : (
        <ul className="faq-alias__list">
          {faqLocaleValues.map((l) => {
            const forLocale = aliases.filter((a) => a.locale === l);
            if (forLocale.length === 0) return null;
            return (
              <li key={l} className="faq-alias__group">
                <span className="faq-alias__lang">{LOCALE_LABELS[l]}</span>
                <ul className="faq-alias__chips">
                  {forLocale.map((a) => (
                    <li key={a.id} className="faq-alias__chip">
                      <span>{a.alias}</span>
                      <button
                        type="button"
                        onClick={() => remove(a.id)}
                        disabled={busy}
                        aria-label={`Remove phrasing: ${a.alias}`}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
