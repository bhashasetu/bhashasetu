"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { chatVoiceValues, faqLocaleValues } from "@/lib/validation/schemas";
import type { ChatConfig } from "@/lib/chat/config";

const LOCALE_LABELS: Record<string, string> = {
  en: "English",
  hi: "हिन्दी — Hindi",
  mr: "मराठी — Marathi",
};

/**
 * Operational settings for My BhashaSetu.
 *
 * Nothing secret appears on this screen. The Sarvam key lives in the Vercel
 * environment; all that is shown is whether one is present.
 *
 * The switches are ordered by how much they change: the kill switch, then what
 * the assistant may reach outside Bhasha Setu, then the bounds. Turning the
 * model on is the consequential one and says so — it changes what the published
 * privacy answer promises a visitor.
 */
export function ChatConfigForm({
  initial,
  sarvamConfigured,
  privacyFaqHref,
}: {
  initial: ChatConfig;
  /** Presence of SARVAM_API_KEY, checked on the server. Never its value. */
  sarvamConfigured: boolean;
  /** The FAQ whose promise changes when the model is switched on. */
  privacyFaqHref: string | null;
}) {
  const router = useRouter();
  const [values, setValues] = useState<ChatConfig>(initial);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ChatConfig>(key: K, value: ChatConfig[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setNotice(null);
    setError(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/chat-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: values.enabled,
          llm_enabled: values.llm_enabled,
          chat_model: values.chat_model ?? "",
          tts_enabled: values.tts_enabled,
          tts_voice: values.tts_voice,
          asr_enabled: values.asr_enabled,
          default_locale: values.default_locale,
          max_response_words: Number(values.max_response_words),
          rate_limit_per_session: Number(values.rate_limit_per_session),
          rate_limit_per_day: Number(values.rate_limit_per_day),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? `Could not save (${res.status})`);
        return;
      }
      setValues((v) => ({ ...v, ...body.data }));
      setNotice("Saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  const toggle = (
    key: keyof ChatConfig,
    label: string,
    hint: string,
    disabled = false
  ) => (
    <div className="hp-row">
      <label className="hp-row__label" htmlFor={`cfg-${key}`}>
        {label}
      </label>
      <div className="hp-row__control">
        <label className="cfg-switch">
          <input
            id={`cfg-${key}`}
            type="checkbox"
            checked={Boolean(values[key])}
            disabled={disabled}
            onChange={(e) => set(key, e.target.checked as never)}
          />
          <span>{values[key] ? "On" : "Off"}</span>
        </label>
        <p className="hp-row__hint">{hint}</p>
      </div>
    </div>
  );

  return (
    <div className="hp-editor">
      <div className="hp-bar">
        <div className="hp-bar__text">
          <h2 className="hp-bar__title">Assistant settings</h2>
          <p className="hp-bar__sub">
            How My BhashaSetu behaves. No keys are stored or shown here.
          </p>
        </div>
        <div className="hp-bar__actions">
          <Link href="/admin/faqs" className="admin-btn admin-btn--ghost">
            Help &amp; FAQ
          </Link>
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            onClick={save}
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
          <h3>Sarvam</h3>
          <span
            className={
              sarvamConfigured
                ? "admin-pill admin-pill--published"
                : "admin-pill admin-pill--draft"
            }
          >
            {sarvamConfigured ? "Configured" : "Not configured"}
          </span>
        </header>
        <p className="admin-page-intro">
          {sarvamConfigured
            ? "A key is present in this environment. Its value is never read into the database, sent to a browser or shown on this screen."
            : "No key is present in this environment. The assistant can still answer from published FAQs and verified words; spoken answers and the model cannot be switched on until one is set."}
        </p>
      </section>

      <section className="admin-card hp-section">
        <header className="hp-section__head">
          <h3>The assistant</h3>
          <span
            className={
              values.enabled
                ? "admin-pill admin-pill--published"
                : "admin-pill admin-pill--draft"
            }
          >
            {values.enabled ? "Answering" : "Off"}
          </span>
        </header>
        <div className="hp-fields">
          {toggle(
            "enabled",
            "Answer questions",
            "Off means My BhashaSetu does not respond at all. Everything else on this page is irrelevant while it is off."
          )}

          <div className="hp-row">
            <label className="hp-row__label" htmlFor="cfg-locale">
              Default language
            </label>
            <div className="hp-row__control">
              <select
                id="cfg-locale"
                value={values.default_locale}
                onChange={(e) => set("default_locale", e.target.value)}
              >
                {faqLocaleValues.map((l) => (
                  <option key={l} value={l}>
                    {LOCALE_LABELS[l]}
                  </option>
                ))}
              </select>
              <p className="hp-row__hint">
                What a visitor gets before they choose. Their browser&apos;s
                preference wins where it is one of the three.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="admin-card hp-section">
        <header className="hp-section__head">
          <h3>Sending questions to Sarvam</h3>
        </header>

        {/* The one setting on this page with a consequence outside it. */}
        <p className="cfg-warning">
          <strong>This changes what you have told visitors.</strong> With the
          model off, nothing a visitor types leaves Bhasha Setu — questions are
          matched against your own published content on your own servers, which
          is what the published answer{" "}
          {privacyFaqHref ? (
            <Link href={privacyFaqHref}>“What happens to what I type here?”</Link>
          ) : (
            "“What happens to what I type here?”"
          )}{" "}
          promises. Turning it on sends visitor questions to a third party and
          makes that answer untrue until you rewrite it.
        </p>

        <div className="hp-fields">
          {toggle(
            "llm_enabled",
            "Use the model",
            "Only for help questions that published FAQs cannot answer. Warli and Katkari lookups never reach it, whatever this is set to.",
            !sarvamConfigured
          )}

          <div className="hp-row">
            <label className="hp-row__label" htmlFor="cfg-model">
              Model
            </label>
            <div className="hp-row__control">
              <input
                id="cfg-model"
                type="text"
                value={values.chat_model ?? ""}
                onChange={(e) => set("chat_model", e.target.value)}
                placeholder="sarvam-model-identifier"
              />
              <p className="hp-row__hint">
                Must match a model your Sarvam account can reach. This is not
                checked against a list — the project has not been given one, and
                a guessed list would be worse than none.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="admin-card hp-section">
        <header className="hp-section__head">
          <h3>Spoken answers</h3>
        </header>
        <p className="admin-page-intro">
          Bulbul reads the answer text aloud. It never speaks a Warli or Katkari
          word: those are always the stored native-speaker recording, or nothing
          — a synthetic voice would be guessing at a pronunciation it has never
          heard.
        </p>
        <div className="hp-fields">
          {toggle(
            "tts_enabled",
            "Read answers aloud",
            "A play button on each answer. Nothing is spoken until a visitor presses it.",
            !sarvamConfigured
          )}

          <div className="hp-row">
            <label className="hp-row__label" htmlFor="cfg-voice">
              Voice
            </label>
            <div className="hp-row__control">
              <select
                id="cfg-voice"
                value={values.tts_voice}
                onChange={(e) => set("tts_voice", e.target.value)}
              >
                {chatVoiceValues.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {toggle(
            "asr_enabled",
            "Accept spoken questions",
            "Off for now. Speech recognition handles Hindi and Marathi well, and turns a spoken Warli word into approximate Devanagari that the lookup then misses.",
            true
          )}
        </div>
      </section>

      <section className="admin-card hp-section">
        <header className="hp-section__head">
          <h3>Limits</h3>
        </header>
        <p className="admin-page-intro">
          These bound what the assistant can cost. They apply only to answers
          that reach Sarvam; database answers are unlimited and free.
        </p>
        <div className="hp-fields">
          {[
            ["max_response_words", "Answer length", "Words, 20 to 400. Longer answers make longer spoken clips."],
            ["rate_limit_per_session", "Per visitor", "Questions one visitor may ask in a session, 1 to 1000."],
            ["rate_limit_per_day", "Per day", "Questions across everyone, 1 to 100000."],
          ].map(([key, label, hint]) => (
            <div className="hp-row" key={key}>
              <label className="hp-row__label" htmlFor={`cfg-${key}`}>
                {label}
              </label>
              <div className="hp-row__control">
                <input
                  id={`cfg-${key}`}
                  type="number"
                  value={String(values[key as keyof ChatConfig] ?? "")}
                  onChange={(e) =>
                    set(key as keyof ChatConfig, Number(e.target.value) as never)
                  }
                />
                <p className="hp-row__hint">{hint}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
