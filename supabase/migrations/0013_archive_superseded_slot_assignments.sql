-- Replacing a slot's image inserted a second published assignment instead of
-- superseding the first, so some slots held several. The public resolver
-- takes the newest, while the Back Office took the first match — meaning the
-- two could disagree about which image a slot shows.
--
-- The upload route now archives prior assignments before inserting. This
-- cleans up the ones already accumulated: keep the newest published
-- assignment per slot, archive the rest. No media is deleted; the assets stay
-- in the library and only the slot linkage is retired.

WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY slot_id ORDER BY created_at DESC, id DESC
         ) AS rn
  FROM public.slot_media_assignments
  WHERE status = 'published'
)
UPDATE public.slot_media_assignments sma
SET status = 'archived', updated_at = now()
FROM ranked
WHERE sma.id = ranked.id
  AND ranked.rn > 1;
