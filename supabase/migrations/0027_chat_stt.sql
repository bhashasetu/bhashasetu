-- Spoken questions are the third thing that leaves Bhasha Setu and gets billed,
-- so they are counted like the other two rather than being the one path with no
-- ceiling on it.

ALTER TABLE public.chat_usage
  ADD COLUMN IF NOT EXISTS stt_calls INT NOT NULL DEFAULT 0;

-- Same check-and-increment inside a single UPDATE as before: two simultaneous
-- requests must not both see room and both spend it.
CREATE OR REPLACE FUNCTION public.chat_claim_call(kind TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  cap INT;
  taken INT;
BEGIN
  SELECT c.rate_limit_per_day INTO cap
  FROM public.chat_config c WHERE c.id = 1;

  IF cap IS NULL THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.chat_usage (day) VALUES (CURRENT_DATE)
  ON CONFLICT (day) DO NOTHING;

  IF kind = 'llm' THEN
    UPDATE public.chat_usage u
    SET llm_calls = u.llm_calls + 1
    WHERE u.day = CURRENT_DATE AND u.llm_calls < cap
    RETURNING u.llm_calls INTO taken;
  ELSIF kind = 'tts' THEN
    UPDATE public.chat_usage u
    SET tts_calls = u.tts_calls + 1
    WHERE u.day = CURRENT_DATE AND u.tts_calls < cap
    RETURNING u.tts_calls INTO taken;
  ELSIF kind = 'stt' THEN
    UPDATE public.chat_usage u
    SET stt_calls = u.stt_calls + 1
    WHERE u.day = CURRENT_DATE AND u.stt_calls < cap
    RETURNING u.stt_calls INTO taken;
  ELSE
    RETURN FALSE;
  END IF;

  RETURN taken IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

GRANT EXECUTE ON FUNCTION public.chat_claim_call(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.chat_claim_call(TEXT) TO authenticated;


-- asr_enabled already exists on chat_config but was never readable publicly,
-- because until now nothing public could act on it. The mic needs to know.
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
  asr_enabled BOOLEAN
) AS $$
  SELECT c.enabled, c.tts_enabled, c.default_locale,
         c.llm_enabled, c.chat_model, c.max_response_words,
         c.tts_voice, c.asr_enabled
  FROM public.chat_config c
  WHERE c.id = 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = '';

GRANT EXECUTE ON FUNCTION public.chat_public_config() TO anon;
GRANT EXECUTE ON FUNCTION public.chat_public_config() TO authenticated;
