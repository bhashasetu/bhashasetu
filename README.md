# Bhasha Setu

A learning platform for **Warli** and **Katkari**, two languages of Maharashtra.
Content is managed in a Back Office, stored in Supabase, and read by the public
site — nothing editorial is hardcoded.

The project brief and its rules are in [`CLAUDE.md`](./CLAUDE.md).

---

## My BhashaSetu — the chat assistant

Live at `/chat`. Managed from `/admin/chat`.

Two modules, chosen by the visitor rather than guessed from their wording:

| | **Learn a word** | **Help & how to** |
|---|---|---|
| Answers from | the verified learning collection | published FAQs |
| Sounds like | a card: word, meanings, recording | a sentence |
| A model may | write the sentence around the card | reword a published answer |
| A model may never | supply a Warli or Katkari word | invent an answer |

### The rule everything else serves

**No model is ever asked what a Warli or Katkari word is.** The language route
terminates in a database query several steps before a provider is reachable, so
inventing a word is structurally impossible rather than discouraged. That is
what makes the panel's *"Uses verified content only"* badge true.

The same rule holds for the synthetic voice, from the other side. Bulbul has no
Warli or Katkari phonology: handed one of those words it applies Hindi phonetics
and produces something confidently wrong a learner cannot detect. So a spoken
answer is **two clips** — the assistant says *"In Warli, 'I'm fine' is said like
this"*, and a community speaker says the word.

`/api/public/chat/speak` therefore refuses text outright. It accepts a FAQ id,
a learning-entry id, or the key of a fixed interface phrase, and looks the words
up itself. A caller cannot make it say anything.

### Finding a word

Deterministic, ordered by how certain the match is, stopping at the first hit
(`src/lib/entries/search.ts`). No model, no embeddings.

1. the word itself
2. a recorded spelling variant (alias)
3. English meaning
4. Hindi meaning
5. transliteration
6. anything containing the term
7. **the other direction** — the collection scanned for a phrase sitting inside
   the question, with both sides canonicalised: punctuation and apostrophes
   removed, contractions written out. This is what makes *"I want to say I am
   hungry in Warli"* find a phrase whose meaning an editor recorded as
   `im hungry`.
8. an honest no-result

A question that names a language gets an honest answer about it: every row
names its own language, matches in the language asked for come first, and when
there are none the card says so — *"We have not collected this in Warli yet.
Here it is in Katkari."*

A question in Learn that the collection cannot answer falls through to the
published FAQs, once, one way. Nothing in Help ever reaches the language
collection.

### A spoken conversation

One press of **Call**, and nothing else:

```
ring  →  greeting  →  you speak  →  transcribed  →  searched
                                                       ↓
   mic reopens  ←  recording  ←  introduction  ←  the entry
```

- **Ring** — India's ringback tone, 400 Hz, generated in the browser rather than
  downloaded. It starts on the press and stops when the greeting is ready, so it
  fills the wait instead of being added in front of it.
- **Greeting** — spoken by Bulbul, named by key. The microphone opens by itself
  when it ends.
- **Your turn ends when you stop talking** — a second and a half of quiet, read
  off the microphone's own signal (RMS, ten times a second). Nothing heard at
  all for eight seconds says so and does not hand the turn back, which is what
  ends a conversation when someone walks away; that silence is never uploaded.
  Twenty-five seconds is the backstop.
- **The answer speaks** — the introduction, then the community recording, then
  the microphone opens again. A miss speaks too, so the conversation does not
  end in silence.
- Recording is converted to **16 kHz mono WAV in the browser** before upload,
  which is the one format proven to be accepted.
- A **typed** question never plays audio by itself.

Sarvam is used for three things and nothing else: transcription (`saaras:v3`,
transcribe mode, language auto-detected), speech (`bulbul:v3`), and optionally
the sentence around an answer. Every one of them is off until an editor switches
it on.

### Back Office — `/admin/chat`

Enable the assistant, spoken questions and spoken answers independently; choose
the voice, the model and the default language; set the persona and any extra
guidance; set per-session and per-day call limits. Test voice and test listening
both make a real call and report what came back.

Editor tone and extra rules are bracketed by the fixed rules, before **and**
after, so nothing typed into the Back Office can displace the guarantees behind
*"Uses verified content only"*.

Provider keys are read on the server only. Nothing in this module puts one in
the browser, and no screen displays one.

### Where it lives

```
src/app/(public)/chat/            the page
src/components/public/ChatPanel.tsx   the panel, the mic, the Call button
src/app/api/public/chat/          route.ts · speak/ · transcribe/
src/lib/chat/
  intent.ts          what kind of question this is, and which language it names
  grounding.ts       what a model is given, and what it may send back
  spoken-phrases.ts  the only words a synthetic voice may say
  sarvam.ts          the provider, through its official SDK
  ringtone.ts        the ring
  listening.ts       when someone has stopped talking
  config.ts · faq-match.ts
src/lib/entries/search.ts         the cascade above
```

### Tests

```bash
npm test
```

Node's own runner against the pure functions that decide what the assistant
says — no browser, no database, no network, under a second. See
[`tests/README.md`](./tests/README.md).

A green `npm test` does not mean the site works: the browser journeys need a
running server and a stand-in for Supabase, and are not in the repository yet.

### Known and not done

- The transliteration of at least one published entry is the literal text
  `(same)`, which the public card prints. The search ignores bracketed editorial
  notes; the display shows what is stored. A Back Office data fix, not a code one.
- `rate_limit_per_day` defaults to 500 — a placeholder, not a costed figure. It
  now governs three billed paths.
- The greeting wording lives in code. If an editor needs to change it, it moves
  to `chat_config` beside the persona.
- Silence detection has never been tried in a real room. `SPEECH_LEVEL` and
  `SILENCE_MS` in `src/lib/chat/listening.ts` are the two numbers to adjust.
- The *Configured / Not configured* view of provider keys that `CLAUDE.md` §19
  asks for has not been built. Keys are safe — they are read on the server and
  never displayed — but there is nowhere in the Back Office to see at a glance
  which providers are set up.

---

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
npm run typecheck
npm run lint
npm test
npm run build
```

Needs `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Provider
keys live in Vercel and Supabase environment settings, never in the browser.
