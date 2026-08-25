import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Reading the assistant's operational settings.
 *
 * One row, id = 1. Nothing secret is stored: the Sarvam key lives in the Vercel
 * environment, is read only on the server at the moment a call is made, and is
 * never written here, never sent to the browser and never displayed.
 */

export type ChatConfig = {
  enabled: boolean;
  llm_enabled: boolean;
  chat_model: string | null;
  tts_enabled: boolean;
  tts_voice: string;
  asr_enabled: boolean;
  default_locale: string;
  max_response_words: number;
  rate_limit_per_session: number;
  rate_limit_per_day: number;
  updated_at: string | null;
};

export const CHAT_CONFIG_COLUMNS =
  "enabled, llm_enabled, chat_model, tts_enabled, tts_voice, asr_enabled, " +
  "default_locale, max_response_words, rate_limit_per_session, " +
  "rate_limit_per_day, updated_at";

/**
 * What the settings are before anyone has touched them, and what they fall
 * back to if the row cannot be read.
 *
 * Everything off. A database that is unreachable must not accidentally enable
 * an assistant, and a fresh install must not start answering before someone
 * has decided it should.
 */
export const CHAT_CONFIG_DEFAULTS: ChatConfig = {
  enabled: false,
  llm_enabled: false,
  chat_model: null,
  tts_enabled: false,
  tts_voice: "priya",
  asr_enabled: false,
  default_locale: "en",
  max_response_words: 120,
  rate_limit_per_session: 30,
  rate_limit_per_day: 500,
  updated_at: null,
};

/** Admin-side read: the whole row. Requires an admin session under RLS. */
export async function getChatConfig(
  supabase: SupabaseClient
): Promise<ChatConfig> {
  const { data } = await supabase
    .from("chat_config")
    .select(CHAT_CONFIG_COLUMNS)
    .eq("id", 1)
    .single();

  return { ...CHAT_CONFIG_DEFAULTS, ...((data ?? {}) as Partial<ChatConfig>) };
}

/**
 * Public-side read: only what a visitor's request depends on.
 *
 * There is no public SELECT policy on chat_config, so this goes through the
 * chat_public_config() function, which returns three fields and not the rate
 * limits or the model name.
 */
export async function getPublicChatConfig(supabase: SupabaseClient): Promise<{
  enabled: boolean;
  ttsEnabled: boolean;
  defaultLocale: string;
}> {
  const { data } = await supabase.rpc("chat_public_config");
  const row = Array.isArray(data) ? data[0] : data;

  return {
    enabled: row?.enabled === true,
    ttsEnabled: row?.tts_enabled === true,
    defaultLocale: row?.default_locale ?? "en",
  };
}

/**
 * Whether the Sarvam key is present in this environment.
 *
 * Presence only. The value is never returned, logged or rendered — the Back
 * Office shows "Configured" or "Not configured" and nothing else
 * (CLAUDE.md section 19).
 */
export function isSarvamConfigured(): boolean {
  return Boolean(process.env.SARVAM_API_KEY?.trim());
}
