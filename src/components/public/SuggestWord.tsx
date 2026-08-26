"use client";

import { useState } from "react";
import type { ExplorerLanguage } from "@/lib/explorer/queries";

/**
 * "Looking for a word we don't have?" (WEB-04).
 *
 * Offered at the moment a search finds nothing, because that is when a visitor
 * knows exactly which word is missing — and it arrives with the term already
 * filled in.
 *
 * A suggestion is a request to go and record something. It is never content:
 * nothing typed here reaches the public site, and nothing becomes a learning
 * entry without an editor creating one through the normal verification
 * workflow (CLAUDE.md sections 25 and 26). The form says so, because someone
 * who suggests a word should know what will happen to it.
 */
export function SuggestWord({
  term,
  languages,
  heading,
  body,
  note,
  ctaText,
}: {
  term: string;
  languages: ExplorerLanguage[];
  heading: string;
  body: string | null;
  note: string | null;
  ctaText: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setState("sending");
    setError(null);
    try {
      const res = await fetch("/api/public/word-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          term: form.get("term"),
          language_id: form.get("language_id") || null,
          meaning: form.get("meaning") || null,
          note: form.get("note") || null,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState("failed");
        setError(payload.error ?? "That could not be sent. Please try again.");
        return;
      }
      setState("sent");
    } catch {
      setState("failed");
      setError("Could not reach Bhasha Setu. Please try again.");
    }
  }

  return (
    <section className="ex-suggest">
      <div className="ex-suggest__mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="M20 20l-4.6-4.6" />
          <path d="M10.5 8v2.5M10.5 13.2v.1" />
        </svg>
      </div>

      <div className="ex-suggest__copy">
        <h2 className="ex-suggest__heading">{heading}</h2>
        {body && <p className="ex-suggest__body">{body}</p>}
        {note && <p className="ex-suggest__note">{note}</p>}

        {state === "sent" ? (
          <p className="ex-suggest__done" role="status">
            Thank you — <strong>{term}</strong> is on our list. A student
            researcher will check it with Warli and Katkari speakers before it
            appears on the site.
          </p>
        ) : (
          open && (
            <form className="ex-suggest__form" onSubmit={submit}>
              <label className="ex-suggest__field">
                <span>Word or phrase</span>
                <input name="term" defaultValue={term} required maxLength={200} />
              </label>
              <label className="ex-suggest__field">
                <span>Language (if you know it)</span>
                <select name="language_id" defaultValue="">
                  <option value="">Not sure</option>
                  {languages.map((language) => (
                    <option key={language.id} value={language.id}>
                      {language.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="ex-suggest__field">
                <span>What does it mean?</span>
                <input name="meaning" maxLength={300} />
              </label>
              <label className="ex-suggest__field ex-suggest__field--wide">
                <span>Anything else that would help us record it</span>
                <textarea name="note" rows={2} maxLength={800} />
              </label>

              {error && (
                <p className="ex-suggest__error" role="alert">
                  {error}
                </p>
              )}

              <button type="submit" className="ex-suggest__send" disabled={state === "sending"}>
                {state === "sending" ? "Sending…" : "Send suggestion"}
              </button>
            </form>
          )
        )}
      </div>

      {state !== "sent" && !open && (
        <button type="button" className="ex-suggest__cta" onClick={() => setOpen(true)}>
          {ctaText}
        </button>
      )}
    </section>
  );
}
