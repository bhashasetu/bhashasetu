import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { routeIntent } from "@/lib/chat/intent";
import { matchFaq, recordUnanswered } from "@/lib/chat/faq-match";
import { getPublicChatConfig } from "@/lib/chat/config";
import { isFaqLocale, type FaqLocale } from "@/lib/faq/queries";
import { pronunciationAudioIds, searchEntries } from "@/lib/entries/search";

/**
 * My BhashaSetu.
 *
 * Every answer this returns comes out of the database. There is no model call
 * anywhere in this file — not for classifying, not for answering, not for
 * phrasing. That is the point: the "Uses verified content only" badge both
 * approved designs print on the assistant is only honest if inventing a Warli
 * word is impossible rather than merely discouraged, and the way to make it
 * impossible is for the language route to terminate in a query.
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
    }
  | {
      kind: "no_result";
      intent: "word_lookup" | "platform_help";
      term?: string;
    }
  | { kind: "disabled" };

/** Bounded so a long paste cannot become a long, expensive query. */
const MAX_MESSAGE = 500;

export async function POST(request: Request) {
  const supabase = await createClient();

  const body = await request.json().catch(() => null);
  const raw = typeof body?.message === "string" ? body.message.trim() : "";
  const requested = typeof body?.locale === "string" ? body.locale : undefined;

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
  const asTerm = await searchEntries(supabase, null, raw);
  const routed = routeIntent(raw, {
    mentionsKnownEntry: asTerm.matchedOn === "native_text" || asTerm.matchedOn === "alias",
  });

  if (routed.intent === "word_lookup") {
    const term = routed.term?.trim() || raw;
    // Reuse the result we already have when the message was the term itself.
    const result =
      term === raw ? asTerm : await searchEntries(supabase, null, term);

    if (result.data.length === 0) {
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

  const faq = await matchFaq(supabase, raw, locale);
  if (faq) {
    return NextResponse.json({
      data: {
        kind: "help_answer",
        intent: "platform_help",
        question: faq.question,
        answer: faq.answer,
        translated: faq.translated,
      } satisfies ChatReply,
    });
  }

  // Nothing matched. This is where the model would go once it is switched on —
  // grounded in the published FAQs and permitted to rephrase them, never to
  // answer from its own knowledge. Until then the honest miss is the answer,
  // and the question goes to the unanswered list for an editor to act on.
  await recordUnanswered(supabase, raw, locale);
  return NextResponse.json({
    data: { kind: "no_result", intent: "platform_help" } satisfies ChatReply,
  });
}
