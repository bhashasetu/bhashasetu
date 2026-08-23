-- Public (anon) reads of CMS tables failed with
--   ERROR: permission denied for function is_admin
--
-- Every CMS table carries a permissive *_admin_all policy whose USING clause
-- calls is_admin(). Postgres evaluates ALL permissive policies for a SELECT,
-- so the call happened even for anonymous visitors reading published rows --
-- and anon had no EXECUTE grant on the function. The result was that the
-- public website could never read any CMS content.
--
-- is_admin() is SECURITY DEFINER with search_path = '', returns only a boolean,
-- and resolves auth.uid() -> NULL for anon, so it simply returns false.
-- Granting EXECUTE exposes no data.

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;
