import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { routeIntent, isGreeting, type ChatMode } from "@/lib/chat/intent";
import { matchFaq, recordUnanswered } from "@/lib/chat/faq-match";
import { getPublicChatConfig } from "@/lib/chat/config";
import { answerFromFaqs, phrase } from "@/lib/chat/sarvam";
import {
  groundEntries,
  groundFaq,
  introducesNativeText,
  systemPrompt,
} from "@/lib/chat/grounding";
import { getPublishedFaqs, faqInLocale } from "@/lib/faq/queries";
import { isFaqLocale, type FaqLocale } from "@/lib/faq/queries";
import { pronunciationAudioIds, searchEntries } from "@/lib/entries/search";

/**
 * My BhashaSetu.
 *
 * Every Warli and Katkari answer comes out of the database, and no model is
 * consulted about one at any point — not to classify the question, not to
 * answer it, not to phrase it. That is what makes the "Uses verified content
 * only" badge both approved designs print here honest: inventing a word is
 * impossible rather than discouraged, because the language route terminates in
 * a query several steps before a provider is reachable.
 *
 * A model is used in exactly one place: a help question that the published
 * FAQs do not match exactly, when an editor has switched it on. It is handed
 * those same published answers and told to work from them alone, so the most
 * it can do is recognise a rewording of something already answered.
 *
 * The response is a typed card, not prose, because most of what the assistant
 * says is a database record — a word with its meanings and its recording — and
 * flattening that into a sentence would lose the play button and the source.
 */

export type ChatReply =
  | {
      kind: "verified_words";
      intent: "word_lookup";
      term: string;
      matchedOn: string;
      /** The sentence around the card. Absent when no model was involved. */
      prose?: string;
      entries: {
        id: string;
        native_text: string;
        transliteration: string | null;
        english_meaning: string | null;
        hindi_meaning: string | null;
        entry_type: string;
        audio_asset_id: string | null;
      }[];
    }
  | {
      kind: "help_answer";
      intent: "platform_help";
      question: string;
      answer: string;
      translated: boolean;
      /** Present when this answer can be read aloud; absent for generated prose. */
      faqId?: string;
      /** True when a model rephrased approved content rather than quoting it. */
      generated?: boolean;
    }
  | {
      kind: "no_result";
      intent: "word_lookup" | "platform_help";
      term?: string;
    }
  | { kind: "greeting" }
  | { kind: "disabled" };

/** Bounded so a long paste cannot become a long, expensive query. */
const MAX_MESSAGE = 500;

/**
 * How much of the conversation travels with each question.
 *
 * Enough for "give me another" and "say that again" to mean something, and
 * bounded because every turn is tokens on a billed call. The history lives in
 * the visitor's browser and is sent with the request: nothing is stored on the
 * server, so there are no transcripts to keep, leak or delete.
 */
const MAX_HISTORY_TURNS = 6;

function readHistory(value: unknown): { role: "user" | "assistant"; content: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (t): t is { role: "user" | "assistant"; content: string } =>
        !!t &&
        (t.role === "user" || t.role === "assistant") &&
        typeof t.content === "string" &&
        t.content.trim().length > 0
    )
    .slice(-MAX_HISTORY_TURNS)
    .map((t) => ({ role: t.role, content: t.content.slice(0, MAX_MESSAGE) }));
}

/**
 * The sentence that goes above a card or an approved answer.
 *
 * Everything here is optional in the strictest sense: if the model is off, the
 * budget is spent, Sarvam is down, or the reply fails the guard, this returns
 * undefined and the visitor gets the card and the stored answer — which is what
 * they got before any of this existed, and is still correct.
 *
 * The guard is the part worth reading. A model told not to write Warli has been
 * asked, not stopped; a reply that puts native script into an English sentence
 * is discarded here rather than shown. See lib/chat/grounding.ts for what that
 * check can and cannot see.
 */
async function sentenceAround(options: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  config: Awaited<ReturnType<typeof getPublicChatConfig>>;
  mode: "learn" | "help";
  locale: FaqLocale;
  question: string;
  history: { role: "user" | "assistant"; content: string }[];
  entries?: Awaited<ReturnType<typeof searchEntries>>["data"];
  faq?: { question: string; answer: string };
}): Promise<string | undefined> {
  const model = options.config.chatModel?.trim();
  if (!options.config.llmEnabled || !model) return undefined;

  let grounding;
  if (options.mode === "learn") {
    if (!options.entries?.length) return undefined;
    // Language names, so the sentence can say "in Katkari" without the model
    // having to infer it from an id.
    const ids = [
      ...new Set(options.entries.map((e) => e.language_id).filter(Boolean)),
    ] as string[];
    const { data: langs } = ids.length
      ? await options.supabase.from("languages").select("id, name").in("id", ids)
      : { data: [] };
    const names = new Map<string, string>(
      (langs ?? []).map((l) => [l.id as string, l.name as string])
    );
    grounding = groundEntries(options.entries, names, options.locale);
  } else {
    if (!options.faq) return undefined;
    grounding = groundFaq(options.faq.question, options.faq.answer);
  }

  if (!grounding.hasFacts) return undefined;

  const { data: allowed } = await options.supabase.rpc("chat_claim_call", {
    kind: "llm",
  });
  if (allowed !== true) return undefined;

  const result = await phrase({
    model,
    system: systemPrompt({
      mode: options.mode,
      locale: options.locale,
      maxWords: options.config.maxResponseWords,
      facts: grounding.facts,
      persona: options.config.persona,
      extraGuidance: options.config.extraGuidance,
    }),
    question: options.question,
    history: options.history,
    maxWords: options.config.maxResponseWords,
  });

  if (!result.ok) return undefined;
  if (introducesNativeText(result.value, options.locale)) return undefined;

  return result.value;
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const body = await request.json().catch(() => null);
  const raw = typeof body?.message === "string" ? body.message.trim() : "";
  const requested = typeof body?.locale === "string" ? body.locale : undefined;
  // Which module the visitor is in. Absent means an older client, or a direct
  // caller: fall back to inferring intent from the sentence, as before.
  const mode: ChatMode | undefined =
    body?.mode === "learn" || body?.mode === "help" ? body.mode : undefined;
  const history = readHistory(body?.history);

  if (!raw) {
    return NextResponse.json({ error: "Ask a question first." }, { status: 400 });
  }
  if (raw.length > MAX_MESSAGE) {
    return NextResponse.json(
      { error: `Please keep questions under ${MAX_MESSAGE} characters.` },
      { status: 400 }
    );
  }

  const config = await getPublicChatConfig(supabase);
  if (!config.enabled) {
    return NextResponse.json({ data: { kind: "disabled" } satisfies ChatReply });
  }

  const locale: FaqLocale = isFaqLocale(requested)
    ? requested
    : isFaqLocale(config.defaultLocale)
      ? config.defaultLocale
      : "en";

  // Is the whole message a term the collection already knows? One indexed
  // lookup, and it lets a bare word typed on its own route correctly without
  // any guessing about sentence shape.
  //
  // Only needed when the module is unknown. A visitor who chose Learn has
  // already told us more than this query could, and one who chose Help is not
  // asking about a word at all — running it there would be a wasted round trip
  // on every message.
  const asTerm = mode ? null : await searchEntries(supabase, null, raw);
  const routed = routeIntent(raw, {
    mode,
    mentionsKnownEntry:
      asTerm?.matchedOn === "native_text" || asTerm?.matchedOn === "alias",
  });

  if (routed.intent === "word_lookup") {
    const term = routed.term?.trim() || raw;
    // Reuse the result we already have when the message was the term itself.
    const result =
      asTerm && term === raw ? asTerm : await searchEntries(supabase, null, term);

    if (result.data.length === 0) {
      // Asked only now that the collection has had its say: "good morning" is a
      // greeting and also one of the phrases, and the phrase must win. Not
      // recorded as unanswered either — "Hi" is not a gap in the collection.
      if (isGreeting(raw)) {
        return NextResponse.json({ data: { kind: "greeting" } satisfies ChatReply });
      }
      await recordUnanswered(supabase, raw, locale);
      return NextResponse.json({
        data: { kind: "no_result", intent: "word_lookup", term } satisfies ChatReply,
      });
    }

    const audio = await pronunciationAudioIds(supabase, result.data);

    return NextResponse.json({
      data: {
        kind: "verified_words",
        intent: "word_lookup",
        term,
        prose: await sentenceAround({
          supabase,
          config,
          mode: "learn",
          locale,
          question: raw,
          history,
          entries: result.data,
        }),
        matchedOn: result.matchedOn ?? "partial",
        entries: result.data.slice(0, 8).map((e) => ({
          id: e.id,
          native_text: e.native_text,
          transliteration: e.transliteration,
          english_meaning: e.english_meaning,
          hindi_meaning: e.hindi_meaning,
          entry_type: e.entry_type,
          audio_asset_id: audio[e.id] ?? null,
        })),
      } satisfies ChatReply,
    });
  }

  if (isGreeting(raw)) {
    return NextResponse.json({ data: { kind: "greeting" } satisfies ChatReply });
  }

  const faq = await matchFaq(supabase, raw, locale);
  if (faq) {
    // The stored answer is the fallback and the source of truth; the model, if
    // it is on, rewords it to fit the question that was actually asked.
    const worded = await sentenceAround({
      supabase,
      config,
      mode: "help",
      locale,
      question: raw,
      history,
      faq: { question: faq.question, answer: faq.answer },
    });

    return NextResponse.json({
      data: {
        kind: "help_answer",
        intent: "platform_help",
        question: faq.question,
        answer: worded ?? faq.answer,
        translated: faq.translated,
        // The play button reads the stored answer, so it is only offered when
        // that is what is on screen — never a model's rewording of it.
        ...(worded ? { generated: true } : { faqId: faq.faq.id }),
      } satisfies ChatReply,
    });
  }

  // Nothing matched exactly. The model gets one chance, and only here: it is
  // given the published answers and told to work from those alone, so the most
  // it can do is recognise that a differently-worded question is one we have
  // already answered. It is never asked about Warli or Katkari — that route
  // ended in the database long before this line.
  //
  // The question is recorded either way. A model answer is a stopgap; the fix
  // is an editor adding the phrasing as an alias, and that only happens if the
  // miss is visible.
  await recordUnanswered(supabase, raw, locale);

  const model = config.chatModel?.trim();

  if (config.llmEnabled && model) {
    const { data: allowed } = await supabase.rpc("chat_claim_call", { kind: "llm" });

    if (allowed === true) {
      const published = await getPublishedFaqs(supabase);
      const grounding = published.map((f) => {
        const { question, answer } = faqInLocale(f, locale);
        return { question, answer };
      });

      const result = await answerFromFaqs({
        model,
        question: raw,
        locale,
        maxWords: config.maxResponseWords,
        faqs: grounding,
      });

      if (result.ok) {
        return NextResponse.json({
          data: {
            kind: "help_answer",
            intent: "platform_help",
            question: raw,
            answer: result.value,
            translated: true,
            generated: true,
          } satisfies ChatReply,
        });
      }
      // A provider that is down, slow, misconfigured, or that honestly said it
      // could not answer, all land here — and all fall through to the same
      // honest miss below. The assistant never fails because Sarvam did.
    }
  }

  return NextResponse.json({
    data: { kind: "no_result", intent: "platform_help" } satisfies ChatReply,
  });
}
