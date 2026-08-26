-- Stories & Voices page furniture (WEB-03 / MOBILE-03).
--
-- This seeds only what is genuinely fixed page content: section headings,
-- editorial copy, the student-team photo grid and the hero band. The
-- interviews and audio clips the page lists are an unbounded, editor-created
-- collection and live in the `stories` table (0018) — not in fixed slots.
--
-- Deliberately seeded EMPTY (CLAUDE.md section 25, content accuracy):
--
--   * stat_1_value .. stat_4_value — "86+ interviews", "45+ families" and the
--     rest are figures in a design mock-up, not counts anyone has verified.
--     Interviews and audio clips are derived from published stories instead;
--     the other two wait for an editor. A stat with no value is not rendered.
--   * quote_text / quote_attribution — the reference attributes a pull-quote
--     to a named Warli elder. Speaker information and community claims are
--     never invented; the card stays hidden until an editor adds a real,
--     consented quote.
--
-- Everything seeded below is the project's own editorial copy.

INSERT INTO public.pages (slug, title, description, status, page_type, structured_data_type)
VALUES (
  'stories-voices',
  'Stories & Voices',
  'Listen, watch and learn from the people who carry Warli and Katkari heritage in their hearts.',
  'published',
  'stories_voices',
  'CollectionPage'
)
ON CONFLICT (slug) DO UPDATE
  SET status = 'published',
      page_type = 'stories_voices',
      structured_data_type = 'CollectionPage';

-- === SECTIONS ===
INSERT INTO public.page_sections (page_id, section_key, title, section_type, status, display_order)
SELECT p.id, v.section_key, v.title, v.section_type, 'published', v.display_order
FROM public.pages p
JOIN (VALUES
  ('hero',                 'Hero',                       'hero',       10),
  ('community_interviews', 'Community Interviews',       'carousel',   20),
  ('voices_audio',         'Voices in Audio',            'carousel',   30),
  ('featured_story',       'Featured Story',             'featured',   40),
  ('student_team',         'Recorded by the Student Team','media_grid', 50),
  ('footer_strip',         'Closing Quote',              'content',    60)
) AS v(section_key, title, section_type, display_order) ON TRUE
WHERE p.slug = 'stories-voices'
ON CONFLICT (page_id, section_key) DO NOTHING;

-- === HERO ===
INSERT INTO public.page_content (section_id, field_key, content, field_type, status)
SELECT ps.id, v.field_key, v.content, 'text', 'published'
FROM public.page_sections ps
JOIN public.pages p ON ps.page_id = p.id
JOIN (VALUES
  ('heading',           'Stories & Voices'),
  ('tagline',           'Real voices. Real lives. Our living archive.'),
  ('description',       'Listen, watch and learn from the people who carry Warli and Katkari heritage in their hearts.'),
  ('stat_1_label',      'Interviews'),
  ('stat_2_label',      'Audio Clips'),
  ('stat_3_label',      'Families'),
  ('stat_4_label',      'Themes'),
  ('stat_1_value',      ''),
  ('stat_2_value',      ''),
  ('stat_3_value',      ''),
  ('stat_4_value',      ''),
  ('quote_text',        ''),
  ('quote_attribution', '')
) AS v(field_key, content) ON TRUE
WHERE p.slug = 'stories-voices' AND ps.section_key = 'hero'
ON CONFLICT (section_id, field_key) DO NOTHING;

INSERT INTO public.media_slots (section_id, slot_key, media_type, aspect_ratio, slot_position, status, alt_text_template)
SELECT ps.id, 'hero_image', 'image', '2:1', 1, 'published',
       'Warli and Katkari community members photographed for Bhasha Setu'
FROM public.page_sections ps
JOIN public.pages p ON ps.page_id = p.id
WHERE p.slug = 'stories-voices' AND ps.section_key = 'hero'
ON CONFLICT (section_id, slot_key) DO NOTHING;

-- === COMMUNITY INTERVIEWS ===
INSERT INTO public.page_content (section_id, field_key, content, field_type, status)
SELECT ps.id, v.field_key, v.content, 'text', 'published'
FROM public.page_sections ps
JOIN public.pages p ON ps.page_id = p.id
JOIN (VALUES
  ('heading',  'Community Interviews'),
  ('subtitle', 'Conversations from the heart of our communities.'),
  ('cta_text', 'View all interviews')
) AS v(field_key, content) ON TRUE
WHERE p.slug = 'stories-voices' AND ps.section_key = 'community_interviews'
ON CONFLICT (section_id, field_key) DO NOTHING;

-- === VOICES IN AUDIO ===
INSERT INTO public.page_content (section_id, field_key, content, field_type, status)
SELECT ps.id, v.field_key, v.content, 'text', 'published'
FROM public.page_sections ps
JOIN public.pages p ON ps.page_id = p.id
JOIN (VALUES
  ('heading',  'Voices in Audio'),
  ('subtitle', 'Short clips. Deep meanings.'),
  ('cta_text', 'Explore all audio clips')
) AS v(field_key, content) ON TRUE
WHERE p.slug = 'stories-voices' AND ps.section_key = 'voices_audio'
ON CONFLICT (section_id, field_key) DO NOTHING;

-- === FEATURED STORY ===
-- Only the eyebrow label and the button text are page content. The title,
-- description, image and duration come from the story record flagged
-- featured, so the same record is not typed in twice.
INSERT INTO public.page_content (section_id, field_key, content, field_type, status)
SELECT ps.id, v.field_key, v.content, 'text', 'published'
FROM public.page_sections ps
JOIN public.pages p ON ps.page_id = p.id
JOIN (VALUES
  ('label',    'Featured Story'),
  ('cta_text', 'Watch Full Story')
) AS v(field_key, content) ON TRUE
WHERE p.slug = 'stories-voices' AND ps.section_key = 'featured_story'
ON CONFLICT (section_id, field_key) DO NOTHING;

-- === RECORDED BY THE STUDENT TEAM ===
-- mobile_heading / mobile_subtitle are the mobile reference's shorter
-- wording for the same band, kept as fields on this section so an editor
-- has one place to change it rather than two parallel sections.
INSERT INTO public.page_content (section_id, field_key, content, field_type, status)
SELECT ps.id, v.field_key, v.content, 'text', 'published'
FROM public.page_sections ps
JOIN public.pages p ON ps.page_id = p.id
JOIN (VALUES
  ('heading',          'Recorded by the Student Team'),
  ('description',      'These stories were recorded during field visits, conversations and workshops by Bhasha Setu student researchers from local schools and colleges. Thank you to every storyteller who shared with us.'),
  ('mobile_heading',   'From Our Students'),
  ('mobile_subtitle',  'Real fieldwork. Real connections.'),
  ('photo_1_caption',  'Listening with respect'),
  ('photo_2_caption',  'Recording memories'),
  ('photo_3_caption',  'Learning together'),
  ('photo_4_caption',  'Our student team in the field'),
  ('ethics_heading',     'Ethical. Respectful. Together.'),
  ('ethics_description', 'We follow community consent, credit every voice and share stories with care and dignity.'),
  ('ethics_cta_text',    'Our Approach')
) AS v(field_key, content) ON TRUE
WHERE p.slug = 'stories-voices' AND ps.section_key = 'student_team'
ON CONFLICT (section_id, field_key) DO NOTHING;

INSERT INTO public.media_slots (section_id, slot_key, media_type, aspect_ratio, slot_position, status, alt_text_template)
SELECT ps.id, 'student_photo_' || i::text, 'image', '4:3', i, 'published',
       'Bhasha Setu student researchers recording community stories'
FROM public.page_sections ps
JOIN public.pages p ON ps.page_id = p.id
CROSS JOIN generate_series(1, 4) AS i
WHERE p.slug = 'stories-voices' AND ps.section_key = 'student_team'
ON CONFLICT (section_id, slot_key) DO NOTHING;

-- === CLOSING QUOTE ===
INSERT INTO public.page_content (section_id, field_key, content, field_type, status)
SELECT ps.id, 'quote',
       'A language is a bridge. A story is a light. Together, they connect generations.',
       'text', 'published'
FROM public.page_sections ps
JOIN public.pages p ON ps.page_id = p.id
WHERE p.slug = 'stories-voices' AND ps.section_key = 'footer_strip'
ON CONFLICT (section_id, field_key) DO NOTHING;

-- === GENERATION PROMPTS ===
-- Every image on this page is a real photograph of real people, taken with
-- consent. None of them may be generated (CLAUDE.md sections 10 and 25), so
-- each slot gets a 'manual' prompt recording that requirement rather than an
-- AI preset. The Back Office shows these slots as upload-only.
INSERT INTO public.generation_prompts (slot_id, provider, model_name, prompt_text, is_active)
SELECT ms.id, 'manual', NULL,
       'Upload a real, consented photograph. Do not generate this image. ' ||
       'Community members and student researchers are real people; an AI ' ||
       'likeness would misrepresent them and breaches the consent this ' ||
       'archive is built on. Record the photographer, consent status and ' ||
       'permission in the asset metadata before publishing.',
       TRUE
FROM public.media_slots ms
JOIN public.page_sections ps ON ms.section_id = ps.id
JOIN public.pages p ON ps.page_id = p.id
WHERE p.slug = 'stories-voices'
  AND NOT EXISTS (
    SELECT 1 FROM public.generation_prompts gp WHERE gp.slot_id = ms.id
  );

-- The hero image doubles as the page's social-card image, so replacing it in
-- the Back Office updates the Open Graph card with no second upload.
UPDATE public.pages p
SET og_image_slot_id = ms.id
FROM public.media_slots ms
JOIN public.page_sections ps ON ms.section_id = ps.id
WHERE ps.page_id = p.id
  AND p.slug = 'stories-voices'
  AND ps.section_key = 'hero'
  AND ms.slot_key = 'hero_image'
  AND p.og_image_slot_id IS NULL;
