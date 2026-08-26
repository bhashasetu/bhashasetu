import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ChatPanel } from "@/components/public/ChatPanel";
import { getPublicChatConfig } from "@/lib/chat/config";
import { getPublishedFaqs } from "@/lib/faq/queries";
import { buildPageMetadata } from "@/lib/seo/page-metadata";
import "./chat.css";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return buildPageMetadata({
    slug: "chat",
    fallback: {
      title: "My BhashaSetu",
      description:
        "Ask about Warli and Katkari words, and about using Bhasha Setu. Answers come from verified community content.",
    },
  });
}

/**
 * My BhashaSetu, per MOBILE-04-MyBhashaSetu.PNG.
 *
 * The chat column only. WEB-05's flanking panels — Saved Words, Learning
 * Journeys, Badges, Your Progress — need public user accounts, which this
 * project does not have; building them would mean inventing an account system
 * nobody asked for. Recorded as a deliberate deviation rather than left looking
 * like an oversight.
 */
export default async function ChatPage() {
  const supabase = await createClient();

  const [config, faqs, { data: page }, { data: entries }] = await Promise.all([
    getPublicChatConfig(supabase),
    getPublishedFaqs(supabase),
    supabase
      .from("pages")
      .select("title, description")
      .eq("slug", "chat")
      .eq("status", "published")
      .maybeSingle(),
    // Real published phrases, for the Learn module's starting points.
    supabase
      .from("learning_entries")
      .select("id, english_meaning, languages(name)")
      .eq("status", "published")
      .not("english_meaning", "is", null)
      .order("display_order")
      .limit(12),
  ]);

  /**
   * Starting points, in both modules taken from published records rather than
   * written into the component.
   *
   * That matters more in Learn than it looks: a hardcoded example would keep
   * being offered after an editor archived the phrase, and every visitor who
   * pressed it would be told the collection does not have it. Built from real
   * rows, a suggestion is always a question the assistant can answer.
   */
  /**
   * Each starting point carries what to show and what to ask, separately.
   *
   * They used to be one string: the chip read "How do you say X in Katkari?"
   * and the server took that sentence apart again to recover X. A round trip
   * through a regex for a value we already had — and one that breaks as soon as
   * a meaning contains a quote, a question mark or the word "in". The label is
   * for the reader; the query is the term, exactly as it is stored.
   */
  const suggestions = {
    help: faqs.slice(0, 3).map((f) => ({ label: f.question_en, query: f.question_en })),
    learn: ((entries ?? []) as unknown as {
      english_meaning: string | null;
      languages: { name: string } | null;
    }[])
      .filter((e) => e.english_meaning && e.languages?.name)
      .slice(0, 3)
      .map((e) => ({
        label: `How do you say “${e.english_meaning}” in ${e.languages!.name}?`,
        query: e.english_meaning!,
      })),
  };

  return (
    <main className="chat-page">
      <header className="chat-page__head">
        <h1>{page?.title || "My BhashaSetu"}</h1>
        <p>
          {page?.description ||
            "Ask about a Warli or Katkari word, or about using Bhasha Setu."}
        </p>
      </header>

      <ChatPanel
        enabled={config.enabled}
        defaultLocale={config.defaultLocale}
        suggestions={suggestions}
        canSpeak={config.ttsEnabled}
        canListen={config.asrEnabled}
      />

      <p className="chat-page__back">
        <Link href="/">← Home</Link>
      </p>
    </main>
  );
}
