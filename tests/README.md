# Tests

```bash
npm test
```

No browser, no database, no network, no new dependency — Node's own test runner
against the pure functions that decide what My BhashaSetu says. It finishes in
under a second, so there is no reason not to run it before a push.

## What is here, and why

`intent.test.mjs` — how a typed question becomes a term to search for.
`grounding.test.mjs` — what a model is given, and what it is allowed to send back.
`spoken-phrases.test.mjs` — the only words a synthetic voice is allowed to say.

Nearly every case is a bug that reached production, kept as the record of what
people actually typed:

- **Curly quotes.** Phones and macOS substitute `'` for `'`. No pattern matched
  them, so `What is 'how are you' in warli` searched for the phrase with the
  quotes still wrapped around it and found nothing.
- **`I'm fine` became `m fine`.** The stop-word list ate the `I` out of the
  contraction.
- **`what is the warli word for rice`** matched the generic `what is X` pattern
  first and searched for `warli word for rice`.
- **`Hi` was told it was not in the collection.** Greetings are now checked, but
  only *after* the collection has looked, because `good morning` is a greeting
  and also one of the published phrases — the phrase has to win.

The spoken half rests on the same rule, from the other side. Bulbul has no Warli
or Katkari phonology: handed one of those words it applies Hindi phonetics and
produces something confidently wrong that a learner cannot detect. So a spoken
answer is two clips — the assistant says *In Warli, "I'm fine" is said like
this*, and a community speaker says the word. `spoken-phrases.test.mjs` holds
the sentence-building function to that: the language name and the meaning go in,
and the native word is never one of its inputs. It also checks that the only
sayable phrases are the named ones, which is what lets the speak route refuse
free text outright.

And one rule the whole architecture rests on, which is cheap to assert and
expensive to lose: **the native Warli or Katkari text is never sent to a model.**
It is given the English gloss, the transliteration and the language name, and
told the word appears in the card beneath its sentence. A model that was never
shown the word cannot write it out wrongly. `grounding.test.mjs` checks it is
absent from the entire prompt, and that nothing an editor types into the Back
Office can displace the rules that keep "Uses verified content only" true.

## What is not here

The browser journeys — two modules, the microphone, the settings screen, the
panel layout — need a running server and a stand-in for Supabase. They have been
run, and they are not in this repo yet. Adding them means committing the mock
server that stands in for the database, which is worth doing and is a larger
piece of work than this file.

So: passing `npm test` does not mean the site works. It means the text handling
and the grounding rules still do what they did when each of the bugs above was
fixed.
