-- Fix security advisor findings from 0001_initial.

-- 1. Views must run with the querying user's permissions/RLS, not the
--    creator's. Recreate with security_invoker.
DROP VIEW public.public_categories_per_language;
CREATE VIEW public.public_categories_per_language WITH (security_invoker = true) AS
SELECT language_id, COUNT(*) AS published_category_count
FROM public.categories
WHERE status = 'published'
GROUP BY language_id;

DROP VIEW public.public_entries_per_language;
CREATE VIEW public.public_entries_per_language WITH (security_invoker = true) AS
SELECT language_id, COUNT(*) AS published_entry_count
FROM public.learning_entries
WHERE status = 'published'
GROUP BY language_id;

DROP VIEW public.admin_entries_status_breakdown;
CREATE VIEW public.admin_entries_status_breakdown WITH (security_invoker = true) AS
SELECT language_id, status, COUNT(*) AS entry_count
FROM public.learning_entries
GROUP BY language_id, status;

-- 2. validate_media_link_target is a trigger-only function. Trigger
--    invocation does not require EXECUTE privilege on the triggering
--    user's role, so revoking public RPC access does not break the
--    trigger; it only stops PostgREST from exposing it as a callable
--    RPC endpoint.
REVOKE EXECUTE ON FUNCTION public.validate_media_link_target() FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_media_link_target() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_media_link_target() FROM public;
