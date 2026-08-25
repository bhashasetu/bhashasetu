-- How the assistant sounds, editable without a deploy.
--
-- Two fields, and the split between them and the code matters more than either.
-- An editor sets tone, and may add rules. An editor cannot remove the rules that
-- make "Uses verified content only" a true statement on the page: those live in
-- lib/chat/grounding.ts, are prepended to every request, and a free-text box
-- that could delete them would be a way to quietly switch the guarantee off.

ALTER TABLE public.chat_config
  ADD COLUMN IF NOT EXISTS persona TEXT,
  ADD COLUMN IF NOT EXISTS extra_guidance TEXT;

COMMENT ON COLUMN public.chat_config.persona IS
  'Tone only. Layered under the fixed rules in lib/chat/grounding.ts, never over them.';
COMMENT ON COLUMN public.chat_config.extra_guidance IS
  'Additional rules an editor wants followed. Cannot remove the fixed ones.';

-- The chat route runs server-side but reads through the public function, so
-- both fields have to come through it. Neither is a secret: they are the
-- assistant''s manners, and a visitor could infer them from one conversation.
DROP FUNCTION IF EXISTS public.chat_public_config();

CREATE FUNCTION public.chat_public_config()
RETURNS TABLE (
  enabled BOOLEAN,
  tts_enabled BOOLEAN,
  default_locale VARCHAR(5),
  llm_enabled BOOLEAN,
  chat_model VARCHAR(100),
  max_response_words INT,
  tts_voice VARCHAR(50),
  asr_enabled BOOLEAN,
  persona TEXT,
  extra_guidance TEXT
) AS $$
  SELECT c.enabled, c.tts_enabled, c.default_locale,
         c.llm_enabled, c.chat_model, c.max_response_words,
         c.tts_voice, c.asr_enabled, c.persona, c.extra_guidance
  FROM public.chat_config c
  WHERE c.id = 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = '';

GRANT EXECUTE ON FUNCTION public.chat_public_config() TO anon;
GRANT EXECUTE ON FUNCTION public.chat_public_config() TO authenticated;
