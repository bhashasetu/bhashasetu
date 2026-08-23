-- Seed Stories & Voices page with interview and testimonial structure

-- =========================================================================
-- 1. Create Stories & Voices Page
-- =========================================================================

INSERT INTO public.pages (slug, title, description, status, page_type)
VALUES (
  'stories-voices',
  'Stories & Voices',
  'Inspiring stories and interviews from the Warli and Katkari communities',
  'draft',
  'stories'
) ON CONFLICT (slug) DO NOTHING;

-- Get the stories page ID for reference in sections
WITH stories_page AS (
  SELECT id FROM public.pages WHERE slug = 'stories-voices'
)

-- =========================================================================
-- 2. Create Stories Section for Featured Interview
-- =========================================================================

INSERT INTO public.page_sections (page_id, section_key, title, section_type, status)
SELECT stories_page.id, 'featured_interview', 'Featured Voice', 'featured', 'draft'
FROM stories_page
ON CONFLICT (page_id, section_key) DO NOTHING;

-- =========================================================================
-- 3. Create Media Slots for Featured Interview
-- =========================================================================

WITH featured_section AS (
  SELECT ps.id
  FROM public.page_sections ps
  JOIN public.pages p ON ps.page_id = p.id
  WHERE p.slug = 'stories-voices' AND ps.section_key = 'featured_interview'
)

INSERT INTO public.media_slots (section_id, slot_key, media_type, aspect_ratio, slot_position)
SELECT featured_section.id, 'interview_thumbnail', 'image', '16:9', 1
FROM featured_section
ON CONFLICT (section_id, slot_key) DO NOTHING;

-- =========================================================================
-- 4. Create Interview Grid Section
-- =========================================================================

WITH stories_page AS (
  SELECT id FROM public.pages WHERE slug = 'stories-voices'
)

INSERT INTO public.page_sections (page_id, section_key, title, section_type, status)
SELECT stories_page.id, 'interview_grid', 'All Interviews', 'media_grid', 'draft'
FROM stories_page
ON CONFLICT (page_id, section_key) DO NOTHING;

-- =========================================================================
-- 5. Create Interview Slots (placeholder for up to 6 interviews)
-- =========================================================================

WITH interview_section AS (
  SELECT ps.id
  FROM public.page_sections ps
  JOIN public.pages p ON ps.page_id = p.id
  WHERE p.slug = 'stories-voices' AND ps.section_key = 'interview_grid'
)

INSERT INTO public.media_slots (section_id, slot_key, media_type, aspect_ratio, slot_position)
SELECT interview_section.id, 'interview_' || i::text, 'image', '1:1', i
FROM interview_section
CROSS JOIN LATERAL generate_series(1, 6) AS i
ON CONFLICT (section_id, slot_key) DO NOTHING;

-- =========================================================================
-- 6. Create About/Heritage Page
-- =========================================================================

INSERT INTO public.pages (slug, title, description, status, page_type)
VALUES (
  'heritage',
  'Our Heritage',
  'Learn about the cultural heritage of Warli and Katkari communities',
  'draft',
  'heritage'
) ON CONFLICT (slug) DO NOTHING;

-- Get the heritage page ID
WITH heritage_page AS (
  SELECT id FROM public.pages WHERE slug = 'heritage'
)

-- =========================================================================
-- 7. Create Warli Heritage Section
-- =========================================================================

INSERT INTO public.page_sections (page_id, section_key, title, section_type, status)
SELECT heritage_page.id, 'warli_heritage', 'Warli Culture & Heritage', 'content', 'draft'
FROM heritage_page
ON CONFLICT (page_id, section_key) DO NOTHING;

-- =========================================================================
-- 8. Create Katkari Heritage Section
-- =========================================================================

WITH heritage_page AS (
  SELECT id FROM public.pages WHERE slug = 'heritage'
)

INSERT INTO public.page_sections (page_id, section_key, title, section_type, status)
SELECT heritage_page.id, 'katkari_heritage', 'Katkari Culture & Heritage', 'content', 'draft'
FROM heritage_page
ON CONFLICT (page_id, section_key) DO NOTHING;

-- =========================================================================
-- 9. Create Chat/My BhashaSetu Page (if separate page needed)
-- =========================================================================

INSERT INTO public.pages (slug, title, description, status, page_type)
VALUES (
  'chat',
  'My BhashaSetu Chat',
  'Your personal learning companion',
  'draft',
  'chat'
) ON CONFLICT (slug) DO NOTHING;

-- Get the chat page ID
WITH chat_page AS (
  SELECT id FROM public.pages WHERE slug = 'chat'
)

-- =========================================================================
-- 10. Create Chat Interface Section
-- =========================================================================

INSERT INTO public.page_sections (page_id, section_key, title, section_type, status)
SELECT chat_page.id, 'chat_interface', 'Chat Interface', 'chat', 'draft'
FROM chat_page
ON CONFLICT (page_id, section_key) DO NOTHING;
