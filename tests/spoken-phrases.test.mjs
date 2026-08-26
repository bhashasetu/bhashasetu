import { test } from "node:test";
import assert from "node:assert/strict";

const { introducing, isSpokenPhrase, spokenPhrase } = await import(
  "../src/lib/chat/spoken-phrases.ts"
);

/**
 * The only words a synthetic voice is allowed to say.
 *
 * Bulbul has no Warli or Katkari phonology: handed one of those words it
 * applies Hindi phonetics and produces something confidently wrong, which a
 * learner has no way to detect. So the assistant introduces a recording — in a
 * language it can pronounce — and a community speaker says the word.
 *
 * These tests hold that line at the only place it can be held cheaply: the
 * function that builds the sentence. Everything it is given is ordinary English
 * or Hindi text; the native word is never one of its inputs.
 */

const NATIVE = "परीक्षण पाँच";

test("the introduction names the language and the meaning, never the word", () => {
  const line = introducing({
    language: "Warli",
    meaning: "I'm fine",
    locale: "en",
  });

  assert.equal(line.includes("Warli"), true);
  assert.equal(line.includes("I'm fine"), true);
  // The recording says this part. Nothing in the sentence can.
  assert.equal(line.includes(NATIVE), false);
});

test("Hindi and Marathi get their own sentence, not an English one", () => {
  const hi = introducing({ language: "वारली", meaning: "मैं ठीक हूँ", locale: "hi" });
  const mr = introducing({ language: "वारली", meaning: "I'm fine", locale: "mr" });

  assert.equal(hi.includes("मैं ठीक हूँ"), true);
  assert.equal(hi.includes("In "), false);
  assert.equal(mr.includes("म्हणतात"), true);
});

test("a missing meaning still produces a whole sentence", () => {
  // An entry whose English meaning has not been filled in yet. The recording is
  // still worth playing, so the introduction must not become "In Warli, "" is
  // said like this." or an empty string.
  for (const locale of ["en", "hi", "mr"]) {
    const line = introducing({ language: "Katkari", meaning: null, locale });
    assert.equal(line.trim().length > 10, true);
    assert.equal(line.includes('""'), false);
    assert.equal(line.includes("Katkari"), true);
  }

  // And with no language either — the id could not be resolved to a name.
  const bare = introducing({ language: null, meaning: null, locale: "en" });
  assert.equal(bare.includes("null"), false);
  assert.equal(bare.includes("undefined"), false);
});

test("whitespace around a meaning does not reach the sentence", () => {
  const line = introducing({ language: "Warli", meaning: "  rice  ", locale: "en" });
  assert.equal(line.includes('"rice"'), true);
});

test("only the named phrases exist, and each has words in every locale", () => {
  assert.equal(isSpokenPhrase("call_open"), true);
  assert.equal(isSpokenPhrase("not_found"), true);
  // The point of naming phrases by key: anything else is not sayable at all.
  assert.equal(isSpokenPhrase("say this instead"), false);
  assert.equal(isSpokenPhrase(""), false);
  assert.equal(isSpokenPhrase(null), false);
  assert.equal(isSpokenPhrase({ toString: () => "call_open" }), false);

  for (const key of ["call_open", "not_found"]) {
    for (const locale of ["en", "hi", "mr"]) {
      assert.equal(spokenPhrase(key, locale).length > 10, true);
    }
    // An unknown locale falls back rather than returning undefined.
    assert.equal(spokenPhrase(key, "ta"), spokenPhrase(key, "en"));
  }
});
