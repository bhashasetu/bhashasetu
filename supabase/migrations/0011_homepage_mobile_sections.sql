-- MOBILE-05-LanguageSelection.PNG is a distinct mobile composition, not a
-- reflow of the desktop homepage. It carries its own hero copy, a "Today's
-- Word" card and a "Stories & Voices" row that the desktop page does not have.
--
-- These are added as additional sections on the same 'homepage' page record so
-- one Back Office screen edits both surfaces. Sections the two surfaces share
-- (WRO project, My BhashaSetu) are reused rather than duplicated.
--
-- Bottom tab bar, "Follow us" icons and the header language control are
-- navigation mechanics and stay code-managed per CLAUDE.md section 4.

-- === MOBILE HERO ===
INSERT INTO public.page_sections (page_id, section_key, title, section_type, status, display_order)
SELECT p.id, 'mobile_hero', 'Mobile Hero', 'hero', 'published', 10
FROM public.pages p WHERE p.slug = 'homepage'
ON CONFLICT (page_id, section_key) DO NOTHING;

INSERT INTO public.page_content (section_id, field_key, content, field_type, status)
SELECT ps.id, v.field_key, v.content, 'text', 'published'
FROM public.page_sections ps
JOIN public.pages p ON ps.page_id = p.id
JOIN (VALUES
  ('greeting',    'Namaste!'),
  ('heading',     'Let''s learn, speak and celebrate our *languages*.'),
  ('description', 'Learn Warli and Katkari. Share stories. Preserve our heritage together.')
) AS v(field_key, content) ON TRUE
WHERE p.slug = 'homepage' AND ps.section_key = 'mobile_hero'
ON CONFLICT (section_id, field_key) DO NOTHING;

INSERT INTO public.media_slots (section_id, slot_key, media_type, aspect_ratio, slot_position, status, alt_text_template)
SELECT ps.id, 'mobile_hero_image', 'image', '4:3', 1, 'published',
       'The Bhasha Setu WRO project vehicle'
FROM public.page_sections ps
JOIN public.pages p ON ps.page_id = p.id
WHERE p.slug = 'homepage' AND ps.section_key = 'mobile_hero'
ON CONFLICT (section_id, slot_key) DO NOTHING;

-- === TODAY'S WORD ===
-- Language content is never invented (CLAUDE.md section 25). These fields are
-- left empty for an editor to fill from verified content; the public card
-- hides itself until the native text is present.
INSERT INTO public.page_sections (page_id, section_key, title, section_type, status, display_order)
SELECT p.id, 'todays_word', 'Today''s Word', 'featured', 'published', 20
FROM public.pages p WHERE p.slug = 'homepage'
ON CONFLICT (page_id, section_key) DO NOTHING;

INSERT INTO public.page_content (section_id, field_key, content, field_type, status)
SELECT ps.id, v.field_key, v.content, 'text', 'published'
FROM public.page_sections ps
JOIN public.pages p ON ps.page_id = p.id
JOIN (VALUES
  ('label',           'Today''s Word'),
  ('native_text',     ''),
  ('english_meaning', ''),
  ('hindi_meaning',   '')
) AS v(field_key, content) ON TRUE
WHERE p.slug = 'homepage' AND ps.section_key = 'todays_word'
ON CONFLICT (section_id, field_key) DO NOTHING;

INSERT INTO public.media_slots (section_id, slot_key, media_type, aspect_ratio, slot_position, status, alt_text_template)
SELECT ps.id, v.slot_key, v.media_type, v.aspect_ratio, v.pos, 'published', v.alt
FROM public.page_sections ps
JOIN public.pages p ON ps.page_id = p.id
JOIN (VALUES
  ('todays_word_audio', 'audio', NULL::varchar, 1, 'Native-speaker pronunciation'),
  ('todays_word_image', 'image', '16:9',        2, 'Warli artwork')
) AS v(slot_key, media_type, aspect_ratio, pos, alt) ON TRUE
WHERE p.slug = 'homepage' AND ps.section_key = 'todays_word'
ON CONFLICT (section_id, slot_key) DO NOTHING;

-- === STORIES & VOICES ===
INSERT INTO public.page_sections (page_id, section_key, title, section_type, status, display_order)
SELECT p.id, 'stories_voices', 'Stories & Voices', 'carousel', 'published', 30
FROM public.pages p WHERE p.slug = 'homepage'
ON CONFLICT (page_id, section_key) DO NOTHING;

INSERT INTO public.page_content (section_id, field_key, content, field_type, status)
SELECT ps.id, v.field_key, v.content, 'text', 'published'
FROM public.page_sections ps
JOIN public.pages p ON ps.page_id = p.id
JOIN (VALUES
  ('heading',  'Stories & Voices'),
  ('cta_text', 'View all')
) AS v(field_key, content) ON TRUE
WHERE p.slug = 'homepage' AND ps.section_key = 'stories_voices'
ON CONFLICT (section_id, field_key) DO NOTHING;

-- Four story cards: title / language / duration per card, plus a thumbnail slot.
INSERT INTO public.page_content (section_id, field_key, content, field_type, status)
SELECT ps.id, 'story_' || n || '_' || f, '', 'text', 'published'
FROM public.page_sections ps
JOIN public.pages p ON ps.page_id = p.id
CROSS JOIN generate_series(1, 4) AS n
CROSS JOIN (VALUES ('title'), ('language'), ('duration')) AS fields(f)
WHERE p.slug = 'homepage' AND ps.section_key = 'stories_voices'
ON CONFLICT (section_id, field_key) DO NOTHING;

INSERT INTO public.media_slots (section_id, slot_key, media_type, aspect_ratio, slot_position, status, alt_text_template)
SELECT ps.id, 'story_' || n || '_thumbnail', 'thumbnail', '16:9', n, 'published',
       'Story thumbnail'
FROM public.page_sections ps
JOIN public.pages p ON ps.page_id = p.id
CROSS JOIN generate_series(1, 4) AS n
WHERE p.slug = 'homepage' AND ps.section_key = 'stories_voices'
ON CONFLICT (section_id, slot_key) DO NOTHING;

-- Stable ordering for the pre-existing desktop sections.
UPDATE public.page_sections ps SET display_order = v.ord
FROM public.pages p, (VALUES
  ('hero', 1), ('wro_project', 2), ('learn_explore', 3),
  ('voices_inspire', 4), ('my_bhasha_setu', 5)
) AS v(key, ord)
WHERE ps.page_id = p.id AND p.slug = 'homepage' AND ps.section_key = v.key;

-- Accent convention: the emphasised run in a heading is marked with
-- *asterisks* in the content and rendered in the accent gold by
-- src/lib/content/accent.tsx. Text without asterisks renders unchanged.
UPDATE public.page_content pc
SET content = 'Bridge to Our Languages. Bridge to Our *Future.*'
FROM public.page_sections ps, public.pages p
WHERE pc.section_id = ps.id AND ps.page_id = p.id AND p.slug = 'homepage'
  AND ps.section_key = 'hero' AND pc.field_key = 'heading';
