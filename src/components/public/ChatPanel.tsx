"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import type { ChatReply } from "@/app/api/public/chat/route";
import type { ChatMode } from "@/lib/chat/intent";

/**
 * The two things My BhashaSetu does, said out loud.
 *
 * They were both reachable before, but only by phrasing a question the right
 * way — so a visitor had no way of knowing the second one existed. Choosing a
 * module is also what makes the routing certain: in Learn, "I'm fine" is a
 * phrase to look up rather than an unrecognised help question.
 */
const MODULES: {
  id: ChatMode;
  label: string;
  blurb: string;
  placeholder: string;
}[] = [
  {
    id: "learn",
    label: "Learn a word",
    blurb:
      "Warli and Katkari words and phrases, with the recording of a community speaker saying it. Ask in English or Hindi.",
    placeholder: 'Try: how do you say "I\'m fine" in Katkari?',
  },
  {
    id: "help",
    label: "Help & how to",
    blurb: "How Bhasha Setu works — the app, the languages, who made it.",
    placeholder: "Try: is Bhasha Setu free?",
  },
];

/**
 * The thread, as the model needs to see it.
 *
 * A word card has no prose of its own unless a model wrote one, so it is
 * summarised by what was actually found — enough for "give me another" to know
 * what "another" would be, without replaying the whole table. Errors and
 * greetings are left out: they are not part of the conversation's meaning.
 */
function asHistory(
  messages: Message[]
): { role: "user" | "assistant"; content: string }[] {
  const out: { role: "user" | "assistant"; content: string }[] = [];

  for (const m of messages) {
    if (m.role === "user") {
      out.push({ role: "user", content: m.text });
      continue;
    }
    if (m.role !== "assistant") continue;

    const reply = m.reply;
    if (reply.kind === "verified_words") {
      const found = reply.entries
        .map((e) => e.english_meaning ?? e.transliteration ?? "")
        .filter(Boolean)
        .join(", ");
      out.push({
        role: "assistant",
        content: reply.prose ?? `Showed the entry for: ${found}`,
      });
    } else if (reply.kind === "help_answer") {
      out.push({ role: "assistant", content: reply.answer });
    } else if (reply.kind === "no_result") {
      out.push({ role: "assistant", content: "That is not in the collection." });
    }
  }

  return out.slice(-6);
}

/** Where the assistant sends people when a page will serve them better. */
const QUICK_ACTIONS = [
  { href: "/learn", label: "Explore languages" },
  { href: "/stories", label: "Listen to stories" },
  { href: "/faq", label: "All questions" },
];

type Message =
  | { id: string; role: "user"; text: string }
  /**
   * `spoken` marks a turn that began at the microphone.
   *
   * A spoken question gets a spoken answer: the stored recording plays by
   * itself rather than waiting for a second press. A typed one never does —
   * audio starting on its own in a quiet room is a good way to lose a reader.
   */
  | { id: string; role: "assistant"; reply: ChatReply; spoken?: boolean }
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
  autoPlay,
}: {
  reply: Extract<ChatReply, { kind: "verified_words" }>;
  /** Play the first recording without waiting to be asked. Spoken turns only. */
  autoPlay?: boolean;
}) {
  return (
    <div className="chat-card">
      {/* The sentence, when a model wrote one. The table below it is the
          answer either way — this only introduces it. */}
      {reply.prose && <p className="chat-card__prose">{reply.prose}</p>}
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
          {reply.entries.map((entry, index) => (
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
                    // Only the first row: a card of eight words must not become
                    // eight recordings playing over each other.
                    autoPlay={autoPlay && index === 0}
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
  autoPlay,
}: {
  assetId: string;
  /** The entry the recording is linked to; the media route checks that link. */
  entryId: string;
  label: string;
  /** Start on arrival, for a question that was asked out loud. */
  autoPlay?: boolean;
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

  /**
   * A spoken question answers itself.
   *
   * Allowed to start without a press because the visitor just pressed the
   * microphone, and a browser counts that as the gesture that permits audio.
   * If it refuses anyway, play() lands in "failed" and the button is still
   * there to press — nothing is lost but the convenience.
   *
   * Once, on arrival: play is hoisted, and re-running on every render would
   * restart the clip under the listener.
   */
  useEffect(() => {
    if (autoPlay) void play(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay]);

  /**
   * @param auto Started by itself, after a spoken question.
   *
   * The distinction matters on failure. A browser that refuses to play without
   * a press, or a device with no audio output, must leave the button there to
   * be pressed — marking the recording "unavailable" would take away the only
   * way to hear it, over something that was never wrong with the recording.
   */
  async function play(auto = false) {
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
      audio.addEventListener("error", () => setState(auto ? "idle" : "failed"));
      audioRef.current = audio;
      await audio.play();
      setState("playing");
    } catch {
      setState(auto ? "idle" : "failed");
    }
  }

  if (state === "failed") {
    return <span className="chat-words__pending">unavailable</span>;
  }

  return (
    <button
      type="button"
      className="chat-words__play"
      onClick={() => void play()}
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
function SpeakButton({
  faqId,
  locale,
  autoPlay,
}: {
  faqId: string;
  locale: string;
  /** Start on arrival, for a question that was asked out loud. */
  autoPlay?: boolean;
}) {
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

  // As above: a spoken question gets a spoken answer, once, on arrival.
  useEffect(() => {
    if (autoPlay) void play(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay]);

  /** @param auto Started by itself, after a spoken question. See AudioButton. */
  async function play(auto = false) {
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
      audio.addEventListener("error", () => setState(auto ? "idle" : "failed"));
      audioRef.current = audio;
      await audio.play();
      setState("playing");
    } catch {
      setState(auto ? "idle" : "failed");
    }
  }

  if (state === "failed") return null;

  return (
    <button
      type="button"
      className="chat-speak"
      onClick={() => void play()}
      aria-label="Read this answer aloud"
    >
      <span aria-hidden="true">{state === "playing" ? "❚❚" : "🔊"}</span>
    </button>
  );
}

/**
 * Ask by speaking.
 *
 * The recording stops itself after MAX_SECONDS — Sarvam's REST transcription is
 * for clips under thirty, and a mic left running by accident is both a bill and
 * a thing nobody expects.
 *
 * What comes back goes into the text box. It is not sent. Sarvam has no Warli
 * or Katkari model, so a spoken native word returns as approximate Devanagari;
 * shown in the box that is an obvious typo the visitor fixes in a second, and
 * sent straight to the search it is an unexplained "we have not collected
 * that". Nothing is stored: the audio exists in the page and in one request.
 */
const MAX_SECONDS = 25;

function MicButton({
  locale,
  onTranscript,
  onFailure,
  disabled,
}: {
  locale: string;
  onTranscript: (text: string) => void;
  /**
   * Said out loud in the thread, not swallowed.
   *
   * A failed transcription used to leave the button back at idle with nothing
   * else changed: the visitor pressed the microphone, spoke, and the page did
   * nothing at all. Undiagnosable from the outside, and indistinguishable from
   * the feature being broken — which, to them, it was.
   */
  onFailure: (message: string) => void;
  disabled: boolean;
}) {
  const [state, setState] = useState<
    "idle" | "recording" | "working" | "denied" | "failed"
  >("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A recorder still holding the microphone after the panel has gone is a
  // browser tab with a live "recording" indicator and no way to stop it.
  useEffect(() => {
    return () => {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      const rec = recorderRef.current;
      if (rec && rec.state !== "inactive") rec.stop();
      rec?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function send(audio: Blob) {
    setState("working");
    try {
      const form = new FormData();
      form.append("audio", audio, "question.webm");
      form.append("locale", locale);

      const res = await fetch("/api/public/chat/transcribe", {
        method: "POST",
        body: form,
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok || !body.data?.text) {
        setState("idle");
        onFailure(
          body.error ??
            "Your question could not be turned into text. Please type it instead."
        );
        return;
      }
      onTranscript(body.data.text);
      setState("idle");
    } catch {
      setState("idle");
      onFailure("Could not reach Bhasha Setu. Please type your question.");
    }
  }

  function stop() {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
  }

  async function start() {
    if (state === "recording") {
      stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      rec.addEventListener("dataavailable", (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      });
      rec.addEventListener("stop", () => {
        stream.getTracks().forEach((t) => t.stop());
        recorderRef.current = null;
        if (chunks.length === 0) {
          setState("idle");
          return;
        }
        void send(new Blob(chunks, { type: rec.mimeType || "audio/webm" }));
      });

      recorderRef.current = rec;
      rec.start();
      setState("recording");
      stopTimerRef.current = setTimeout(stop, MAX_SECONDS * 1000);
    } catch {
      // Refused permission, or no microphone. Either way the text box works.
      setState("denied");
    }
  }

  if (state === "denied") {
    return (
      <span className="chat-mic__note" role="status">
        No microphone — type instead.
      </span>
    );
  }

  const label =
    state === "recording"
      ? "Stop recording"
      : state === "working"
        ? "Listening to your question"
        : "Ask by speaking";

  return (
    <button
      type="button"
      className={
        state === "recording" ? "chat-mic chat-mic--live" : "chat-mic"
      }
      onClick={start}
      disabled={disabled || state === "working"}
      aria-label={label}
      title={label}
    >
      <span aria-hidden="true">
        {state === "recording" ? "■" : state === "working" ? "…" : "🎤"}
      </span>
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
  canListen,
}: {
  enabled: boolean;
  defaultLocale: string;
  /** Published starting points, per module: what to show, and what to ask. */
  suggestions: {
    learn: { label: string; query: string }[];
    help: { label: string; query: string }[];
  };
  /** Whether spoken answers are switched on in the Back Office. */
  canSpeak: boolean;
  /** Whether spoken questions are switched on in the Back Office. */
  canListen: boolean;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [mode, setMode] = useState<ChatMode>("learn");
  const [input, setInput] = useState("");
  const locale = useSyncExternalStore(
    subscribeLocale,
    () => readLocale(defaultLocale),
    () => defaultLocale
  );
  const [sending, setSending] = useState(false);
  const current = MODULES.find((m) => m.id === mode) ?? MODULES[0];
  const starters = suggestions[mode] ?? [];
  const threadRef = useRef<HTMLDivElement | null>(null);
  // Ids only need to be unique within this thread, so a counter serves and
  // keeps the handler pure (Date.now() is not).
  const nextId = useRef(0);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [messages]);

  /**
   * @param spoken The question came from the microphone, so the answer speaks
   *   back — the stored recording plays without a second press. This is the
   *   difference between a voice conversation and voice-assisted typing.
   */
  async function send(text: string, spoken = false) {
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
        body: JSON.stringify({
          message: question,
          locale,
          mode,
          // So "give me another" means something. Held here in the browser and
          // sent with the question — the server keeps no transcript.
          history: asHistory(messages),
        }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessages((m) => [
          ...m,
          { id: id + "e", role: "error", text: body.error ?? "Something went wrong." },
        ]);
        return;
      }
      setMessages((m) => [
        ...m,
        { id: id + "a", role: "assistant", reply: body.data, spoken },
      ]);
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

      <div className="chat-modes" role="tablist" aria-label="What would you like to do?">
        {MODULES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            id={`chat-mode-${m.id}`}
            aria-selected={mode === m.id}
            aria-controls="chat-thread"
            className={mode === m.id ? "is-current" : undefined}
            onClick={() => setMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <p className="chat-modes__blurb">{current.blurb}</p>

      {messages.length === 0 && starters.length > 0 && (
        <ul className="chat-suggestions">
          {starters.map((s) => (
            <li key={s.label}>
              {/* The label is prose for the reader; the query is the term the
                  collection actually stores. Sending the label would mean
                  parsing it back apart on the server. */}
              <button type="button" onClick={() => void send(s.query)}>
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div
        className="chat-thread"
        id="chat-thread"
        role="tabpanel"
        aria-labelledby={`chat-mode-${mode}`}
        ref={threadRef}
        aria-live="polite"
      >
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
            return <WordCard reply={reply} key={m.id} autoPlay={m.spoken} />;
          }
          if (reply.kind === "help_answer") {
            return (
              <div className="chat-bubble chat-bubble--assistant" key={m.id}>
                <p>{reply.answer}</p>
                <div className="chat-bubble__foot">
                  {canSpeak && reply.faqId && (
                    <SpeakButton
                      faqId={reply.faqId}
                      locale={locale}
                      autoPlay={m.spoken}
                    />
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
          if (reply.kind === "greeting") {
            return (
              <div className="chat-bubble chat-bubble--assistant" key={m.id}>
                <p>
                  Namaste. Ask me for a Warli or Katkari word or phrase and
                  I&apos;ll show you what it means, with a recording of someone
                  who speaks it. For questions about Bhasha Setu itself, switch
                  to <strong>Help &amp; how to</strong>.
                </p>
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
          placeholder={current.placeholder}
          onChange={(e) => setInput(e.target.value)}
          maxLength={500}
          autoComplete="off"
        />
        {canListen && (
          <MicButton
            locale={locale}
            disabled={sending}
            onFailure={(message) =>
              setMessages((m) => [
                ...m,
                { id: `mic${(nextId.current += 1)}`, role: "error", text: message },
              ])
            }
            // Sent, not typed into the box. The transcript still appears in the
            // thread as the question that was asked, so a mis-heard word is
            // visible and can simply be asked again.
            onTranscript={(text) => void send(text, true)}
          />
        )}
        <button
          type="submit"
          className="chat-composer__send"
          disabled={sending || !input.trim()}
          aria-label="Send"
        >
          <span aria-hidden="true">➤</span>
        </button>
      </form>

      {/* WEB-05's Quick actions. Kept because a page is often the better answer
          than a conversation, and because they show a visitor that the rest of
          the site exists. The account-backed panels beside them in the
          reference — Saved Words, Badges, Your progress — need public sign-in,
          which this project does not have. */}
      <nav className="chat-actions" aria-label="Elsewhere on Bhasha Setu">
        {QUICK_ACTIONS.map((a) => (
          <Link key={a.href} href={a.href}>
            {a.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
