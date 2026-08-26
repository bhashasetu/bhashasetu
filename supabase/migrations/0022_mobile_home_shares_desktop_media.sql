-- The mobile home page stops duplicating media that already exists elsewhere.
--
-- Two things were being uploaded and typed a second time for mobile:
--
--   1. mobile_hero_image duplicated the desktop hero_image. Both slots are 4:3
--      and both show the same WRO vehicle, so the mobile screen now reads the
--      desktop slot directly and one upload serves both surfaces.
--
--   2. story_1..4_thumbnail, together with story_N_title / _language /
--      _duration, duplicated records that already live in public.stories and
--      already drive the /stories page. The mobile row now reads those
--      records, so publishing an interview in the Stories module puts it on
--      the mobile home page with no second upload and nothing retyped.
--
-- Slots and fields are archived, never deleted (CLAUDE.md sections 8 and 26).
-- The media assets behind them are untouched and remain in the Media Library,
-- so nothing an editor uploaded is lost — it simply stops being wired to a
-- slot that no longer has a job.
--
-- The mobile_hero section itself stays: its greeting, heading and description
-- are genuinely mobile-only copy. Only its image slot is retired. Likewise
-- stories_voices keeps its heading and call-to-action label, which are still
-- editorial; only the per-card duplicates go.

-- === 1. Retire the duplicated media slots ===
UPDATE public.media_slots ms
SET status = 'archived', updated_at = now()
FROM public.page_sections ps, public.pages p
WHERE ms.section_id = ps.id
  AND ps.page_id = p.id
  AND p.slug = 'homepage'
  AND (
    (ps.section_key = 'mobile_hero' AND ms.slot_key = 'mobile_hero_image')
    OR (ps.section_key = 'stories_voices'
        AND ms.slot_key ~ '^story_[0-9]+_thumbnail$')
  );

-- === 2. Retire the per-card text duplicated from public.stories ===
UPDATE public.page_content pc
SET status = 'archived', updated_at = now()
FROM public.page_sections ps, public.pages p
WHERE pc.section_id = ps.id
  AND ps.page_id = p.id
  AND p.slug = 'homepage'
  AND ps.section_key = 'stories_voices'
  AND pc.field_key ~ '^story_[0-9]+_(title|language|duration)$';

-- === 3. Retire the assignments that pointed at the archived slots ===
-- The assignment is the wiring, not the asset. Archiving it leaves the
-- Media Library untouched while making sure no published assignment dangles
-- off a slot the site no longer renders.
UPDATE public.slot_media_assignments a
SET status = 'archived'
FROM public.media_slots ms, public.page_sections ps, public.pages p
WHERE a.slot_id = ms.id
  AND ms.section_id = ps.id
  AND ps.page_id = p.id
  AND p.slug = 'homepage'
  AND ms.status = 'archived'
  AND a.status = 'published';
