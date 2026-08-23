import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function ChatPage() {
  const supabase = await createClient();

  const { data: chatPage } = await supabase
    .from("pages")
    .select(
      `
      *,
      page_sections(
        *,
        page_content(*)
      )
      `
    )
    .eq("slug", "chat")
    .eq("status", "published")
    .single();

  // Fallback page structure
  const title = chatPage?.title || "My BhashaSetu";
  const description = chatPage?.description || "Your personal learning companion for exploring Warli and Katkari languages";

  return (
    <main>
      <h1>{title}</h1>
      <p>{description}</p>

      {/* Chat Interface Section */}
      <section style={{ minHeight: "500px", border: "1px solid #ccc", padding: "20px", borderRadius: "8px" }}>
        <h2>Chat Assistant</h2>
        <p style={{ color: "#666" }}>Chat interface coming soon.</p>
        <p>Ask questions about Warli and Katkari languages, explore stories, and learn from your personal learning companion.</p>
      </section>

      <p>
        <Link href="/">← Home</Link>
      </p>
    </main>
  );
}
