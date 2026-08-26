import { test } from "node:test";
import assert from "node:assert/strict";

const { canonical, containedMatch } = await import("../src/lib/entries/search.ts");
const { namedLanguage } = await import("../src/lib/chat/intent.ts");

/**
 * Finding a phrase inside a question.
 *
 * The cascade in search.ts reduces a question to a term and looks the term up.
 * When the reduction fails — an unusual phrasing, a transcription in the wrong
 * script — the phrase can be sitting in the collection and still be missed,
 * because nothing compares the two directly. The last step does, and these are
 * the sentences it has to survive.
 */

/** The real row, as an editor typed it into the Back Office. */
const HUNGRY = {
  id: "e-hungry",
  native_text: "malaala bookh laagli hi",
  // Not "I'm hungry". This spelling is why the lookup failed in production.
  english_meaning: "im hungry",
  hindi_meaning: "mujhe bookh lagi hai",
  // And a transliteration recorded as a note, because the native text is
  // already in Latin letters.
  transliteration: "(same)",
  entry_type: "phrase",
  language_id: "lang-katkari",
  category_id: "cat-food",
};

const FINE = {
  id: "e-fine",
  native_text: "परीक्षण पाँच",
  english_meaning: "I'm fine",
  hindi_meaning: "मैं ठीक हूँ",
  transliteration: "Parikshan panch",
  entry_type: "phrase",
  language_id: "lang-warli",
  category_id: "cat-greetings",
};

const SCHOOL = {
  id: "e-school",
  native_text: "shaala kutha ahe",
  english_meaning: "where is the school",
  hindi_meaning: "स्कूल कहाँ है",
  transliteration: null,
  entry_type: "phrase",
  language_id: "lang-warli",
  category_id: "cat-questions",
};

const ALL = [HUNGRY, FINE, SCHOOL];

test('"I am hungry" finds the entry stored as "im hungry"', () => {
  // Typed on mybhashasetu.in, and answered with "Bhasha Setu is not a
  // translator" — because the search never compared the two spellings.
  const found = containedMatch(ALL, "I want to say I am hungry in Warli. How do I say that?");
  assert.deepEqual(found.map((r) => r.id), ["e-hungry"]);
});

test("all three spellings of a contraction meet in the middle", () => {
  for (const asked of [
    "how do i say I'm fine in warli",
    "how do i say Im fine in warli",
    "how do i say I am fine in warli",
    // Curly apostrophe, which is what a phone types.
    "how do i say I’m fine in warli",
  ]) {
    assert.deepEqual(
      containedMatch(ALL, asked).map((r) => r.id),
      ["e-fine"],
      asked
    );
  }
});

test("an editor's note is not a phrase to match on", () => {
  // The transliteration of the hungry entry is "(same)". Without a guard it is
  // four characters of extremely common English and matches almost anything.
  const found = containedMatch(ALL, "is the meaning the same in both languages");
  assert.deepEqual(found, []);
});

test("the longest match wins, so a question is about one thing", () => {
  const found = containedMatch(ALL, "where is the school, and is there a tree");
  assert.deepEqual(found.map((r) => r.id), ["e-school"]);
});

test("a whole word, not a fragment of one", () => {
  // "im hungry" must not be found inside "Kim hungrye", and short meanings
  // must not match inside longer words.
  assert.deepEqual(containedMatch(ALL, "swim hungryish"), []);
});

test("the Hindi meaning is searched too", () => {
  // Someone typing romanised Hindi, which the reduction to a term does not
  // handle at all.
  const found = containedMatch(ALL, "warli me mujhe bookh lagi hai kaise bolte hain");
  assert.deepEqual(found.map((r) => r.id), ["e-hungry"]);
});

test("nothing in the collection stays nothing", () => {
  assert.deepEqual(containedMatch(ALL, "how do you say aeroplane in warli"), []);
  assert.deepEqual(containedMatch(ALL, ""), []);
  assert.deepEqual(containedMatch([], "i am hungry"), []);
});

test("canonical only ever compares, and leaves Devanagari alone", () => {
  assert.equal(canonical("I'm  Fine!"), "i am fine");
  assert.equal(canonical("Don't"), "do not");
  assert.equal(canonical("can't"), "can not");
  assert.equal(canonical("cannot"), "can not");
  assert.equal(canonical("मैं ठीक हूँ।"), "मैं ठीक हूँ");
});

test("which language the question asked for", () => {
  assert.equal(namedLanguage("I want to say I am hungry in Warli."), "warli");
  assert.equal(namedLanguage("how do you say rice in Katkari"), "katkari");
  assert.equal(namedLanguage("वार्ली में यह कैसे कहते हैं"), "warli");
  // Neither named, so there is nothing to correct.
  assert.equal(namedLanguage("how do you say rice"), null);
  // Both named: a comparison, not a request for one of them.
  assert.equal(namedLanguage("is rice the same in warli and katkari"), null);
});
