-- A real bound on what the assistant can cost, rather than a number in a
-- settings screen that nothing enforces.
--
-- Only calls that leave Bhasha Setu are counted. Answers that come from the
-- database — which is nearly all of them — are free and unlimited, and are not
-- recorded here at all.
--
-- One row per day, and no user data: this is a pair of integers, not a log.

CREATE TABLE IF NOT EXISTS public.chat_usage (
  day DATE PRIMARY KEY DEFAULT CURRENT_DATE,
  llm_calls INT NOT NULL DEFAULT 0,
  tts_calls INT NOT NULL DEFAULT 0
);

ALTER TABLE public.chat_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_chat_usage" ON public.chat_usage;
CREATE POLICY "admin_read_chat_usage" ON public.chat_usage
  FOR ALL USING (public.is_admin());

/**
 * Claim one call against today's budget.
 *
 * Check-then-increment in two statements would let simultaneous requests both
 * see room and both spend it, so the limit is enforced inside a single UPDATE:
 * the row is only changed when it is still under the limit, and the function
 * returns false when it was not.
 *
 * SECURITY DEFINER because a visitor's request must be able to claim a call
 * without the table being publicly writable — there is no public policy on
 * chat_usage at all, so this function is the only way in.
 */
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
  ELSE
    RETURN FALSE;
  END IF;

  RETURN taken IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

GRANT EXECUTE ON FUNCTION public.chat_claim_call(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.chat_claim_call(TEXT) TO authenticated;

COMMENT ON TABLE public.chat_usage IS
  'Daily count of calls that left Bhasha Setu. No user data. Database answers are not counted.';


-- chat_public_config() gains the three fields the chat route needs to decide
-- whether to call the model. It is called server-side, but anon may execute it,
-- so the rate limits are deliberately still absent — a model identifier and a
-- word cap are not secrets, a spend ceiling is closer to one.
-- Postgres will not change a function's return type in place, so the old
-- signature is dropped first. Nothing reads it between the two statements: the
-- whole file runs in one transaction.
DROP FUNCTION IF EXISTS public.chat_public_config();

CREATE FUNCTION public.chat_public_config()
RETURNS TABLE (
  enabled BOOLEAN,
  tts_enabled BOOLEAN,
  default_locale VARCHAR(5),
  llm_enabled BOOLEAN,
  chat_model VARCHAR(100),
  max_response_words INT,
  tts_voice VARCHAR(50)
) AS $$
  SELECT c.enabled, c.tts_enabled, c.default_locale,
         c.llm_enabled, c.chat_model, c.max_response_words, c.tts_voice
  FROM public.chat_config c
  WHERE c.id = 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = '';

GRANT EXECUTE ON FUNCTION public.chat_public_config() TO anon;
GRANT EXECUTE ON FUNCTION public.chat_public_config() TO authenticated;
