import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/**
 * A visitor's suggestion that Bhasha Setu record a word.
 *
 * Write-only from the public side, exactly like the assistant's unanswered
 * log: the RLS policy permits an insert and no select, so nothing anyone
 * submits can be read back by another visitor.
 *
 * What lands here is a request, not content. It is never rendered on the
 * public site and never becomes a learning entry on its own — an editor
 * creates one through the normal draft → verified → published workflow, with
 * community speakers, or the suggestion is declined (CLAUDE.md sections 25
 * and 26).
 */
const Suggestion = z.object({
  term: z.string().trim().min(1).max(200),
  language_id: z.string().uuid().nullable().optional(),
  meaning: z.string().trim().max(300).nullable().optional(),
  note: z.string().trim().max(800).nullable().optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = Suggestion.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please give the word you would like us to record." },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // A language id is accepted only if it names a published language, so a
  // crafted request cannot attach a suggestion to something else.
  let languageId: string | null = parsed.data.language_id ?? null;
  if (languageId) {
    const { data: language } = await supabase
      .from("languages")
      .select("id")
      .eq("id", languageId)
      .eq("status", "published")
      .maybeSingle();
    if (!language) languageId = null;
  }

  const { error } = await supabase.from("word_suggestions").insert({
    term: parsed.data.term,
    language_id: languageId,
    meaning: parsed.data.meaning ?? null,
    note: parsed.data.note ?? null,
  });

  if (error) {
    return NextResponse.json(
      { error: "That could not be saved. Please try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({ data: { received: true } });
}
