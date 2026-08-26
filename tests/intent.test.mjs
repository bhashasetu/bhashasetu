import { test } from "node:test";
import assert from "node:assert/strict";

const { routeIntent, stripFrame, isGreeting } = await import(
  "../src/lib/chat/intent.ts"
);

/**
 * How a question becomes a term.
 *
 * Every case here failed in production at least once, or guards a rule that
 * something else depends on. The tests are the record of what people actually
 * typed — taken from the unanswered log, not imagined.
 *
 * No browser and no database: this is pure text handling, and it runs in
 * milliseconds so there is no excuse for not running it.
 */

const learn = (m) => routeIntent(m, { mode: "learn" });
const help = (m) => routeIntent(m, { mode: "help" });

test("the term survives the sentence it arrived in", () => {
  assert.equal(learn("how do you say 'I'm fine' in katkari?").term, "I'm fine");
  assert.equal(learn("how do I say good morning in Warli").term, "good morning");
  assert.equal(learn("what is the warli word for rice").term, "rice");
  assert.equal(learn("the katkari word for water").term, "water");
  assert.equal(learn("thank you in warli").term, "thank you");
  assert.equal(learn("say good night in katkari").term, "good night");
  assert.equal(learn("what does tandul mean").term, "tandul");
  assert.equal(learn("meaning of tandul").term, "tandul");
});

test("Hindi and Marathi framings are recognised", () => {
  assert.equal(learn("तांदूळ का अर्थ क्या है").term, "तांदूळ");
  assert.equal(learn("तांदूळ म्हणजे काय").term, "तांदूळ");
  assert.equal(
    learn("मैं ठीक हूँ को कातकरी में क्या कहते हैं").term,
    "मैं ठीक हूँ"
  );
  assert.equal(
    learn("कातकरी में मैं ठीक हूँ कैसे कहते हैं").term,
    "मैं ठीक हूँ"
  );
});

test("curly quotes, which phones and macOS type by default", () => {
  // From the unanswered log. The quotes were U+2018/U+2019, no pattern matched
  // them, and the search ran for the phrase with the quotes still attached.
  assert.equal(learn("What is ‘how are you’ in warli").term, "how are you");
  assert.equal(learn("What is 'how are you' in warli").term, "how are you");
  assert.equal(
    learn("how do you say ‘I’m fine’ in Katkari?").term,
    "I'm fine"
  );
  assert.equal(learn('what does “tandul” mean').term, "tandul");
});

test("a bare phrase is the term, untouched", () => {
  // "I'm fine" lost its "I" to the stop-word list and became "m fine".
  assert.equal(learn("I'm fine").term, "I'm fine");
  assert.equal(learn("good morning").term, "good morning");
  assert.equal(learn("तांदूळ").term, "तांदूळ");
  // Two published entries mean exactly this; a capital must not change it.
  assert.equal(learn("How are you").term, "How are you");
});

test("the module decides the route, not the wording", () => {
  for (const m of ["is it free", "who made this", "I'm fine", "asdfgh"]) {
    assert.equal(learn(m).intent, "word_lookup", m);
  }
  for (const m of ["is it free", "how do you say rice in warli", "tandul"]) {
    assert.equal(help(m).intent, "platform_help", m);
  }
});

test("with no module chosen, the old inference still stands", () => {
  assert.equal(routeIntent("how do you say rice in warli").intent, "word_lookup");
  assert.equal(routeIntent("is it free").intent, "platform_help");
  assert.equal(stripFrame("hello there"), null);
});

test("greetings are greetings, and are asked about after the search", () => {
  for (const g of ["Hi", "hello", "Namaste", "नमस्ते", "hey!"]) {
    assert.equal(isGreeting(g), true, g);
  }
  assert.equal(isGreeting("how do you say rice in warli"), false);
  assert.equal(isGreeting("tandul"), false);
  // "good morning" is a greeting AND a published phrase. The caller asks this
  // only after the collection has looked, so the phrase always wins.
  assert.equal(isGreeting("good morning"), true);
});
