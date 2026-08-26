import { createClient } from "@/lib/supabase/server";
import { ChatConfigForm } from "@/components/admin/ChatConfigForm";
import { getChatConfig, isSarvamConfigured } from "@/lib/chat/config";

export const dynamic = "force-dynamic";

/**
 * My BhashaSetu settings (CLAUDE.md section 13, module 11).
 *
 * The key presence check runs here, on the server, and only a boolean crosses
 * to the browser. The value itself never leaves this process.
 */
export default async function AdminChatConfigPage() {
  const supabase = await createClient();
  const config = await getChatConfig(supabase);

  // Deep-link the warning at the answer it makes untrue, so an editor can go
  // and rewrite it rather than being told it exists somewhere.
  const { data: privacyFaq } = await supabase
    .from("chat_faqs")
    .select("id")
    .eq("slug", "what-happens-to-what-i-type")
    .maybeSingle();

  return (
    <ChatConfigForm
      initial={config}
      sarvamConfigured={isSarvamConfigured()}
      privacyFaqHref={privacyFaq ? `/admin/faqs/${privacyFaq.id}` : null}
    />
  );
}
