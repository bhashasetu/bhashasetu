-- Operational settings for My BhashaSetu.
--
-- One row, never more: these are settings for the one assistant, not a list of
-- anything, and a table that can hold two rows will eventually hold two rows
-- and nobody will know which one is live.
--
-- What is here is deliberately non-secret. SARVAM_API_KEY lives in the Vercel
-- environment and is never read into the database, never sent to the browser
-- and never shown in the Back Office — the screen reports only whether it is
-- present (CLAUDE.md section 19).
--
-- Everything is off by default, including on a fresh database. The assistant
-- can therefore be built, deployed and reviewed before anyone decides to turn
-- it on, and turned off again in one click if it misbehaves.

CREATE TABLE IF NOT EXISTS public.chat_config (
  id INT PRIMARY KEY DEFAULT 1,

  -- The kill switch. With this off the assistant does not answer at all.
  enabled BOOLEAN NOT NULL DEFAULT FALSE,

  -- Off means the assistant answers only from published FAQs and verified
  -- learning entries, and nothing a visitor types ever leaves Bhasha Setu.
  -- Turning it on changes what the FAQ 'what-happens-to-what-i-type' promises,
  -- which is why the Back Office says so beside the switch.
  llm_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  chat_model VARCHAR(100),

  -- Reads answers aloud. Never the Warli or Katkari word itself: that is
  -- always the stored native-speaker recording or nothing at all.
  tts_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  tts_voice VARCHAR(50) NOT NULL DEFAULT 'priya',

  -- Speech input. Off for V1: it transcribes Hindi and Marathi well and
  -- mangles a spoken Warli word into approximate Devanagari, which is the
  -- half that matters most here.
  asr_enabled BOOLEAN NOT NULL DEFAULT FALSE,

  default_locale VARCHAR(5) NOT NULL DEFAULT 'en',

  -- Bounds, so a runaway or a bored visitor cannot cost anything unbounded.
  max_response_words INT NOT NULL DEFAULT 120,
  rate_limit_per_session INT NOT NULL DEFAULT 30,
  rate_limit_per_day INT NOT NULL DEFAULT 500,

  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT chat_config_singleton CHECK (id = 1),
  CONSTRAINT chat_config_locale_valid CHECK (default_locale IN ('en', 'hi', 'mr')),
  CONSTRAINT chat_config_words_sane CHECK (max_response_words BETWEEN 20 AND 400),
  CONSTRAINT chat_config_session_limit_sane CHECK (rate_limit_per_session BETWEEN 1 AND 1000),
  CONSTRAINT chat_config_day_limit_sane CHECK (rate_limit_per_day BETWEEN 1 AND 100000)
);

INSERT INTO public.chat_config (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.chat_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_full_chat_config" ON public.chat_config;
CREATE POLICY "admin_full_chat_config" ON public.chat_config
  FOR ALL USING (public.is_admin());

-- The public chat route needs to know whether it may answer, and in which
-- language. It does not need the rate limits or the model name, so it does not
-- get them: there is no public SELECT policy on the table, and this returns
-- the three fields a visitor's request actually depends on.
--
-- SECURITY DEFINER with an empty search_path, matching is_admin() above.
CREATE OR REPLACE FUNCTION public.chat_public_config()
RETURNS TABLE (
  enabled BOOLEAN,
  tts_enabled BOOLEAN,
  default_locale VARCHAR(5)
) AS $$
  SELECT c.enabled, c.tts_enabled, c.default_locale
  FROM public.chat_config c
  WHERE c.id = 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = '';

GRANT EXECUTE ON FUNCTION public.chat_public_config() TO anon;
GRANT EXECUTE ON FUNCTION public.chat_public_config() TO authenticated;

COMMENT ON TABLE public.chat_config IS
  'Single-row operational settings for My BhashaSetu. Non-secret only: the Sarvam key lives in the Vercel environment and is never stored here.';
COMMENT ON COLUMN public.chat_config.llm_enabled IS
  'When true, a visitor question can be sent to Sarvam. This makes the FAQ answer ''what-happens-to-what-i-type'' untrue until it is updated.';
