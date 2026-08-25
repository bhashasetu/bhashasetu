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

  const [config, faqs, { data: page }] = await Promise.all([
    getPublicChatConfig(supabase),
    getPublishedFaqs(supabase),
    supabase
      .from("pages")
      .select("title, description")
      .eq("slug", "chat")
      .eq("status", "published")
      .maybeSingle(),
  ]);

  // Starting points, taken from real published questions rather than written
  // into the component — so they change when an editor changes the FAQ.
  const suggestions = faqs.slice(0, 3).map((f) => f.question_en);

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
      />

      <p className="chat-page__back">
        <Link href="/">← Home</Link>
      </p>
    </main>
  );
}
