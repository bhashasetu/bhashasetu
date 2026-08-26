"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  chatModelValues,
  chatVoiceValues,
  faqLocaleValues,
} from "@/lib/validation/schemas";
import type { ChatConfig } from "@/lib/chat/config";

const LOCALE_LABELS: Record<string, string> = {
  en: "English",
  hi: "हिन्दी — Hindi",
  mr: "मराठी — Marathi",
};

const MODEL_LABELS: Record<string, string> = {
  "sarvam-105b": "sarvam-105b — 128K context",
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
  const [test, setTest] = useState<
    { ok: boolean; text: string } | "running" | null
  >(null);
  const [voiceTest, setVoiceTest] = useState<
    { ok: boolean; text: string } | "running" | null
  >(null);

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
          persona: values.persona ?? "",
          extra_guidance: values.extra_guidance ?? "",
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

  /**
   * One real call to Sarvam, showing whatever comes back.
   *
   * Whether this account can reach the chosen model is not something the code
   * can know, so it is asked rather than assumed — and the provider's own error
   * is more useful to whoever is reading this screen than any paraphrase.
   */
  async function testConnection() {
    setTest("running");
    try {
      const res = await fetch("/api/admin/chat-config/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: values.chat_model ?? "" }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTest({ ok: false, text: body.error ?? `Failed (${res.status})` });
        return;
      }
      const d = body.data;
      setTest(
        d.ok
          ? { ok: true, text: `Replied in ${d.ms} ms: ${d.reply}` }
          : {
              ok: false,
              text: `${d.status ?? "No response"} — ${d.detail}`,
            }
      );
    } catch (err) {
      setTest({
        ok: false,
        text: err instanceof Error ? err.message : "Test failed",
      });
    }
  }

  /**
   * One real Bulbul call, so a silent microphone has somewhere to be looked at.
   *
   * Without this, "voice does not work" gives an editor nothing: the provider's
   * complaint never reaches a screen. This shows it verbatim.
   */
  async function testVoice() {
    setVoiceTest("running");
    try {
      const res = await fetch("/api/admin/chat-config/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "voice", voice: values.tts_voice }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setVoiceTest({ ok: false, text: body.error ?? `Failed (${res.status})` });
        return;
      }
      const d = body.data;
      setVoiceTest(
        d.ok
          ? { ok: true, text: `${d.reply} in ${d.ms} ms` }
          : { ok: false, text: `${d.status ?? "No response"} — ${d.detail}` }
      );
    } catch (err) {
      setVoiceTest({
        ok: false,
        text: err instanceof Error ? err.message : "Test failed",
      });
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
              <select
                id="cfg-model"
                value={values.chat_model ?? ""}
                onChange={(e) => set("chat_model", e.target.value || null)}
              >
                <option value="">None chosen</option>
                {chatModelValues.map((m) => (
                  <option key={m} value={m}>
                    {MODEL_LABELS[m] ?? m}
                  </option>
                ))}
              </select>
              <p className="hp-row__hint">
                The only chat model Sarvam&apos;s client can send to. Your
                account still has to have access to it — Test connection is how
                you find out.
              </p>
              <div className="cfg-test">
                <button
                  type="button"
                  className="admin-btn admin-btn--ghost"
                  onClick={testConnection}
                  disabled={!sarvamConfigured || test === "running"}
                >
                  {test === "running" ? "Testing…" : "Test connection"}
                </button>
                {test && test !== "running" && (
                  <span
                    className={
                      test.ok
                        ? "cfg-test__result cfg-test__result--ok"
                        : "cfg-test__result cfg-test__result--error"
                    }
                  >
                    {test.text}
                  </span>
                )}
              </div>
              <p className="hp-row__hint">
                One real question, billed like any other. It shows the model&apos;s
                reply, or the provider&apos;s own error verbatim.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="admin-card hp-section">
        <header className="hp-section__head">
          <h3>How it sounds</h3>
        </header>
        <p className="admin-page-intro">
          These reach the model on every question. What they cannot do is remove
          the rules that keep the site&apos;s promise: answer only from your
          published content, never write or translate a Warli or Katkari word,
          say so plainly when there is no answer. Those are in the code, sent
          ahead of anything written here, and repeated after it.
        </p>
        <div className="hp-fields">
          <div className="hp-row">
            <label className="hp-row__label" htmlFor="cfg-persona">
              Tone
            </label>
            <div className="hp-row__control">
              <textarea
                id="cfg-persona"
                rows={3}
                maxLength={600}
                value={values.persona ?? ""}
                placeholder="Warm and encouraging. Short sentences a school student can read easily."
                onChange={(e) => set("persona", e.target.value)}
              />
              <p className="hp-row__hint">
                How it speaks, not what it knows. Leave empty for the plain
                default.
              </p>
            </div>
          </div>

          <div className="hp-row">
            <label className="hp-row__label" htmlFor="cfg-extra_guidance">
              Extra rules
            </label>
            <div className="hp-row__control">
              <textarea
                id="cfg-extra_guidance"
                rows={4}
                maxLength={1200}
                value={values.extra_guidance ?? ""}
                placeholder={
                  "Anything you want it to always do. For example:\n" +
                  "Point people to the Language Explorer when they ask for a word we do not have."
                }
                onChange={(e) => set("extra_guidance", e.target.value)}
              />
              <p className="hp-row__hint">
                Added to the fixed rules, never instead of them. Both fields are
                sent with every question, so keep them short — long ones cost on
                every message.
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
              <div className="cfg-test">
                <button
                  type="button"
                  className="admin-btn admin-btn--ghost"
                  onClick={testVoice}
                  disabled={!sarvamConfigured || voiceTest === "running"}
                >
                  {voiceTest === "running" ? "Testing…" : "Test voice"}
                </button>
                {voiceTest && voiceTest !== "running" && (
                  <span
                    className={
                      voiceTest.ok
                        ? "cfg-test__result cfg-test__result--ok"
                        : "cfg-test__result cfg-test__result--error"
                    }
                  >
                    {voiceTest.text}
                  </span>
                )}
              </div>
              <p className="hp-row__hint">
                One short Bulbul call, billed like any other. It proves the key,
                the account and this voice — and shows Sarvam&apos;s own error
                when something is wrong, which is the only place that error is
                visible. Spoken questions fail the same way when the account is
                the problem, so test here first.
              </p>
            </div>
          </div>

          {toggle(
            "asr_enabled",
            "Accept spoken questions",
            "A microphone beside the text box. What Sarvam hears goes into the box for the visitor to check and correct — it is never sent on their behalf, because a spoken Warli word comes back as approximate Devanagari and a transcript they can see is one they can fix.",
            !sarvamConfigured
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
