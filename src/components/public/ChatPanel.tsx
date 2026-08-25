"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import type { ChatReply } from "@/app/api/public/chat/route";

type Message =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; reply: ChatReply }
  | { id: string; role: "error"; text: string };

const LOCALES = [
  ["en", "English"],
  ["hi", "हिन्दी"],
  ["mr", "मराठी"],
] as const;

const LOCALE_KEY = "bhashasetu.chat.locale";

/**
 * The chosen language, kept in the browser.
 *
 * localStorage is an external mutable source, so it is read through
 * useSyncExternalStore rather than copied into state in an effect. That also
 * fixes a subtler problem: the server has no way to know what a visitor chose
 * last time, so it renders the configured default and the client corrects it —
 * which useSyncExternalStore expresses directly through its server snapshot,
 * instead of producing a hydration mismatch.
 *
 * Every access is guarded: a private window or a browser set to block site
 * data throws on read, and that is not a reason to fail.
 */
const localeListeners = new Set<() => void>();

function subscribeLocale(onChange: () => void) {
  localeListeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    localeListeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readLocale(fallback: string): string {
  try {
    const saved = window.localStorage.getItem(LOCALE_KEY);
    return saved && LOCALES.some(([code]) => code === saved) ? saved : fallback;
  } catch {
    return fallback;
  }
}

function writeLocale(value: string) {
  try {
    window.localStorage.setItem(LOCALE_KEY, value);
  } catch {
    // Not stored; the choice still applies for this visit.
  }
  for (const notify of localeListeners) notify();
}

/**
 * Where the answers come from, said in the card rather than in a footnote.
 *
 * A learner has no way to tell a checked community recording from a fluent
 * guess, so the assistant says which it is every time. This is the "Uses
 * verified content only" badge from both approved designs, made specific.
 */
function MatchNote({ matchedOn }: { matchedOn: string }) {
  const how: Record<string, string> = {
    native_text: "Matched the word itself",
    alias: "Matched a recorded spelling variant",
    english_meaning: "Matched the English meaning",
    hindi_meaning: "Matched the Hindi meaning",
    transliteration: "Matched the transliteration",
    partial: "Closest match in the collection",
  };
  return (
    <p className="chat-card__source">
      <span aria-hidden="true">✓</span> From verified community content.{" "}
      {how[matchedOn] ?? "Matched the collection"}.
    </p>
  );
}

function WordCard({
  reply,
}: {
  reply: Extract<ChatReply, { kind: "verified_words" }>;
}) {
  return (
    <div className="chat-card">
      <table className="chat-words">
        <thead>
          <tr>
            <th scope="col">Word</th>
            <th scope="col">Meaning</th>
            <th scope="col">
              <span className="visually-hidden">Pronunciation</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {reply.entries.map((entry) => (
            <tr key={entry.id}>
              <td>
                <span className="chat-words__native">{entry.native_text}</span>
                {entry.transliteration && (
                  <span className="chat-words__translit">
                    {entry.transliteration}
                  </span>
                )}
              </td>
              <td>
                {entry.english_meaning}
                {entry.hindi_meaning && (
                  <span className="chat-words__hindi">{entry.hindi_meaning}</span>
                )}
              </td>
              <td className="chat-words__audio">
                {entry.audio_asset_id ? (
                  <AudioButton
                    assetId={entry.audio_asset_id}
                    entryId={entry.id}
                    label={entry.native_text}
                  />
                ) : (
                  // Honest rather than a synthetic voice: no recording has been
                  // made with a community speaker for this word yet.
                  <span className="chat-words__pending" title="No recording yet">
                    —
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <MatchNote matchedOn={reply.matchedOn} />
    </div>
  );
}

/**
 * Plays the stored native-speaker recording.
 *
 * The URL is fetched on first press rather than up front, so a card of eight
 * words costs no audio requests until someone wants to hear one.
 */
function AudioButton({
  assetId,
  entryId,
  label,
}: {
  assetId: string;
  /** The entry the recording is linked to; the media route checks that link. */
  entryId: string;
  label: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "playing" | "failed">(
    "idle"
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // One element at a time, stopped on unmount so a card scrolled away does
  // not keep playing.
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  async function play() {
    if (state === "playing") {
      audioRef.current?.pause();
      setState("idle");
      return;
    }
    setState("loading");
    try {
      // The public media route signs a URL only after checking the asset is
      // published, linked to this entry, and cleared for public playback —
      // so a recording without recorded consent stays unplayable.
      const params = new URLSearchParams({
        media_asset_id: assetId,
        linked_entry_type: "learning_entry",
        linked_entry_id: entryId,
      });
      const res = await fetch(`/api/public/media?${params.toString()}`);
      const body = await res.json().catch(() => ({}));
      const url = body.data?.url;
      if (!url) {
        setState("failed");
        return;
      }
      const audio = new Audio(url);
      audio.addEventListener("ended", () => setState("idle"));
      audio.addEventListener("error", () => setState("failed"));
      audioRef.current = audio;
      await audio.play();
      setState("playing");
    } catch {
      setState("failed");
    }
  }

  if (state === "failed") {
    return <span className="chat-words__pending">unavailable</span>;
  }

  return (
    <button
      type="button"
      className="chat-words__play"
      onClick={play}
      aria-label={`Play the pronunciation of ${label}`}
    >
      <span aria-hidden="true">{state === "playing" ? "❚❚" : "▶"}</span>
    </button>
  );
}

/**
 * Reads an approved answer aloud.
 *
 * Sends the FAQ's id, never the text: the speak route looks the answer up
 * itself, so nothing a visitor typed and no Warli or Katkari word can ever be
 * handed to a synthetic voice. Only help answers get this control at all —
 * word cards carry the human recording instead.
 */
function SpeakButton({ faqId, locale }: { faqId: string; locale: string }) {
  const [state, setState] = useState<"idle" | "loading" | "playing" | "failed">(
    "idle"
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  async function play() {
    if (state === "playing") {
      audioRef.current?.pause();
      setState("idle");
      return;
    }
    setState("loading");
    try {
      const res = await fetch("/api/public/chat/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faq_id: faqId, locale }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.data?.audio) {
        setState("failed");
        return;
      }
      const audio = new Audio(`data:audio/wav;base64,${body.data.audio}`);
      audio.addEventListener("ended", () => setState("idle"));
      audio.addEventListener("error", () => setState("failed"));
      audioRef.current = audio;
      await audio.play();
      setState("playing");
    } catch {
      setState("failed");
    }
  }

  if (state === "failed") return null;

  return (
    <button
      type="button"
      className="chat-speak"
      onClick={play}
      aria-label="Read this answer aloud"
    >
      <span aria-hidden="true">{state === "playing" ? "❚❚" : "🔊"}</span>
    </button>
  );
}

/**
 * My BhashaSetu.
 *
 * Deliberately hand-rolled rather than built on a chat SDK: most of what this
 * renders is a database record with a play button, not a stream of tokens, so
 * a streaming abstraction would be fought rather than used.
 */
export function ChatPanel({
  enabled,
  defaultLocale,
  suggestions,
  canSpeak,
}: {
  enabled: boolean;
  defaultLocale: string;
  /** Published questions, offered as starting points. */
  suggestions: string[];
  /** Whether spoken answers are switched on in the Back Office. */
  canSpeak: boolean;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const locale = useSyncExternalStore(
    subscribeLocale,
    () => readLocale(defaultLocale),
    () => defaultLocale
  );
  const [sending, setSending] = useState(false);
  const threadRef = useRef<HTMLDivElement | null>(null);
  // Ids only need to be unique within this thread, so a counter serves and
  // keeps the handler pure (Date.now() is not).
  const nextId = useRef(0);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [messages]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || sending) return;

    const id = `m${(nextId.current += 1)}`;
    setMessages((m) => [...m, { id, role: "user", text: question }]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/public/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question, locale }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessages((m) => [
          ...m,
          { id: id + "e", role: "error", text: body.error ?? "Something went wrong." },
        ]);
        return;
      }
      setMessages((m) => [...m, { id: id + "a", role: "assistant", reply: body.data }]);
    } catch {
      setMessages((m) => [
        ...m,
        { id: id + "e", role: "error", text: "Could not reach Bhasha Setu. Try again." },
      ]);
    } finally {
      setSending(false);
    }
  }

  if (!enabled) {
    return (
      <div className="chat-panel chat-panel--off">
        <p>
          My BhashaSetu is not available right now. You can still search the{" "}
          <Link href="/learn">Language Explorer</Link> and read the{" "}
          <Link href="/faq">frequently asked questions</Link>.
        </p>
      </div>
    );
  }

  return (
    <div className="chat-panel">
      <div className="chat-panel__head">
        <span className="chat-verified">
          <span aria-hidden="true">✓</span> Uses verified content only
        </span>
        <div className="chat-langs" role="group" aria-label="Language">
          {LOCALES.map(([code, label]) => (
            <button
              key={code}
              type="button"
              className={locale === code ? "is-current" : undefined}
              aria-pressed={locale === code}
              onClick={() => writeLocale(code)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {messages.length === 0 && suggestions.length > 0 && (
        <ul className="chat-suggestions">
          {suggestions.map((s) => (
            <li key={s}>
              <button type="button" onClick={() => send(s)}>
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="chat-thread" ref={threadRef} aria-live="polite">
        {messages.map((m) => {
          if (m.role === "user") {
            return (
              <p className="chat-bubble chat-bubble--user" key={m.id}>
                {m.text}
              </p>
            );
          }
          if (m.role === "error") {
            return (
              <p className="chat-bubble chat-bubble--error" key={m.id} role="alert">
                {m.text}
              </p>
            );
          }

          const reply = m.reply;
          if (reply.kind === "verified_words") {
            return <WordCard reply={reply} key={m.id} />;
          }
          if (reply.kind === "help_answer") {
            return (
              <div className="chat-bubble chat-bubble--assistant" key={m.id}>
                <p>{reply.answer}</p>
                <div className="chat-bubble__foot">
                  {canSpeak && reply.faqId && (
                    <SpeakButton faqId={reply.faqId} locale={locale} />
                  )}
                  {!reply.translated && (
                    <span className="chat-card__source">
                      Not written in your language yet.
                    </span>
                  )}
                  {reply.generated && (
                    // Said plainly: this sentence was assembled by a model from
                    // published answers, rather than being one of them.
                    <span className="chat-card__source">
                      Written from Bhasha Setu&apos;s published answers.
                    </span>
                  )}
                </div>
              </div>
            );
          }
          if (reply.kind === "disabled") {
            return (
              <p className="chat-bubble chat-bubble--assistant" key={m.id}>
                My BhashaSetu is not available right now.
              </p>
            );
          }
          return (
            <div className="chat-bubble chat-bubble--assistant" key={m.id}>
              {reply.intent === "word_lookup" ? (
                <p>
                  <strong>{reply.term}</strong> is not in our collection yet. We
                  only publish words that have been recorded and checked with
                  Warli and Katkari speakers, so this means we have not collected
                  it — not that it does not exist. Try the{" "}
                  <Link href="/learn">Language Explorer</Link>.
                </p>
              ) : (
                <p>
                  I do not have an answer for that. You can read the{" "}
                  <Link href="/faq">frequently asked questions</Link>, or ask about a
                  Warli or Katkari word.
                </p>
              )}
            </div>
          );
        })}
        {sending && (
          <p className="chat-bubble chat-bubble--assistant chat-bubble--waiting">
            Looking…
          </p>
        )}
      </div>

      <form
        className="chat-composer"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <label className="visually-hidden" htmlFor="chat-input">
          Ask a question
        </label>
        <input
          id="chat-input"
          type="text"
          value={input}
          placeholder="Ask about a word, or how to use Bhasha Setu"
          onChange={(e) => setInput(e.target.value)}
          maxLength={500}
          autoComplete="off"
        />
        <button
          type="submit"
          className="chat-composer__send"
          disabled={sending || !input.trim()}
          aria-label="Send"
        >
          <span aria-hidden="true">➤</span>
        </button>
      </form>
    </div>
  );
}
