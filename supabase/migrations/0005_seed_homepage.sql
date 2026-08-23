-- Seed homepage CMS structure with pages, sections, slots, and generation prompts

-- =========================================================================
-- 1. Create Homepage Page
-- =========================================================================

INSERT INTO public.pages (slug, title, description, status, page_type)
VALUES (
  'homepage',
  'Bhasha Setu Home',
  'Main landing page for Bhasha Setu learning platform',
  'draft',
  'homepage'
) ON CONFLICT (slug) DO NOTHING;

-- Get the homepage page ID for reference in sections
WITH homepage AS (
  SELECT id FROM public.pages WHERE slug = 'homepage'
)

-- =========================================================================
-- 2. Create Hero Section
-- =========================================================================

INSERT INTO public.page_sections (page_id, section_key, title, section_type, status)
SELECT homepage.id, 'hero', 'Hero Section', 'hero', 'draft'
FROM homepage
ON CONFLICT (page_id, section_key) DO NOTHING;

-- =========================================================================
-- 3. Create Hero Media Slots
-- =========================================================================

WITH hero_section AS (
  SELECT ps.id
  FROM public.page_sections ps
  JOIN public.pages p ON ps.page_id = p.id
  WHERE p.slug = 'homepage' AND ps.section_key = 'hero'
)

INSERT INTO public.media_slots (section_id, slot_key, media_type, aspect_ratio, slot_position)
SELECT hero_section.id, 'hero_image', 'hero_image', '16:9', 1
FROM hero_section
ON CONFLICT (section_id, slot_key) DO NOTHING;

-- =========================================================================
-- 4. Create Generation Prompts for Hero Image
-- =========================================================================

WITH hero_slot AS (
  SELECT ms.id
  FROM public.media_slots ms
  JOIN public.page_sections ps ON ms.section_id = ps.id
  JOIN public.pages p ON ps.page_id = p.id
  WHERE p.slug = 'homepage' AND ps.section_key = 'hero' AND ms.slot_key = 'hero_image'
)

INSERT INTO public.generation_prompts (slot_id, provider, prompt_text, model_name)
SELECT
  hero_slot.id,
  'openai',
  'A vibrant, modern 3D illustration of a friendly robot with an art deco lantern-like head, designed for an educational platform. The robot should have warm, welcoming colors (blues, oranges, greens) and be shown in a stylized environment that evokes Warli and Katkari cultural patterns. The style should be friendly and approachable for students. 16:9 aspect ratio.',
  'dall-e-3'
FROM hero_slot
ON CONFLICT DO NOTHING;

WITH hero_slot AS (
  SELECT ms.id
  FROM public.media_slots ms
  JOIN public.page_sections ps ON ms.section_id = ps.id
  JOIN public.pages p ON ps.page_id = p.id
  WHERE p.slug = 'homepage' AND ps.section_key = 'hero' AND ms.slot_key = 'hero_image'
)

INSERT INTO public.generation_prompts (slot_id, provider, prompt_text, model_name)
SELECT
  hero_slot.id,
  'fal.ai',
  'A vibrant, modern 3D illustration of a friendly robot with an art deco lantern-like head, designed for an educational platform. The robot should have warm, welcoming colors (blues, oranges, greens) and be shown in a stylized environment that evokes Warli and Katkari cultural patterns. The style should be friendly and approachable for students.',
  'flux-pro'
FROM hero_slot
ON CONFLICT DO NOTHING;

-- =========================================================================
-- 5. Create WRO Project Section
-- =========================================================================

WITH homepage AS (
  SELECT id FROM public.pages WHERE slug = 'homepage'
)

INSERT INTO public.page_sections (page_id, section_key, title, section_type, status)
SELECT homepage.id, 'wro_project', 'WRO Project', 'featured', 'draft'
FROM homepage
ON CONFLICT (page_id, section_key) DO NOTHING;

-- =========================================================================
-- 6. Create WRO Video Slot
-- =========================================================================

WITH wro_section AS (
  SELECT ps.id
  FROM public.page_sections ps
  JOIN public.pages p ON ps.page_id = p.id
  WHERE p.slug = 'homepage' AND ps.section_key = 'wro_project'
)

INSERT INTO public.media_slots (section_id, slot_key, media_type, aspect_ratio, slot_position)
SELECT wro_section.id, 'video', 'video', '16:9', 1
FROM wro_section
ON CONFLICT (section_id, slot_key) DO NOTHING;

-- =========================================================================
-- 7. Create Learn. Explore. Celebrate. Section
-- =========================================================================

WITH homepage AS (
  SELECT id FROM public.pages WHERE slug = 'homepage'
)

INSERT INTO public.page_sections (page_id, section_key, title, section_type, status)
SELECT homepage.id, 'learn_explore', 'Learn. Explore. Celebrate.', 'media_grid', 'draft'
FROM homepage
ON CONFLICT (page_id, section_key) DO NOTHING;

-- =========================================================================
-- 8. Create Language Card Media Slots
-- =========================================================================

WITH learn_section AS (
  SELECT ps.id
  FROM public.page_sections ps
  JOIN public.pages p ON ps.page_id = p.id
  WHERE p.slug = 'homepage' AND ps.section_key = 'learn_explore'
)

INSERT INTO public.media_slots (section_id, slot_key, media_type, aspect_ratio, slot_position)
SELECT learn_section.id, 'warli_image', 'image', '1:1', 1
FROM learn_section
ON CONFLICT (section_id, slot_key) DO NOTHING;

WITH learn_section AS (
  SELECT ps.id
  FROM public.page_sections ps
  JOIN public.pages p ON ps.page_id = p.id
  WHERE p.slug = 'homepage' AND ps.section_key = 'learn_explore'
)

INSERT INTO public.media_slots (section_id, slot_key, media_type, aspect_ratio, slot_position)
SELECT learn_section.id, 'katkari_image', 'image', '1:1', 2
FROM learn_section
ON CONFLICT (section_id, slot_key) DO NOTHING;

-- =========================================================================
-- 9. Create Generation Prompts for Language Cards
-- =========================================================================

WITH warli_slot AS (
  SELECT ms.id
  FROM public.media_slots ms
  JOIN public.page_sections ps ON ms.section_id = ps.id
  JOIN public.pages p ON ps.page_id = p.id
  WHERE p.slug = 'homepage' AND ps.section_key = 'learn_explore' AND ms.slot_key = 'warli_image'
)

INSERT INTO public.generation_prompts (slot_id, provider, prompt_text, model_name)
SELECT
  warli_slot.id,
  'openai',
  'A minimalist, colorful illustration inspired by Warli tribal art style. Show stylized human figures, tribal patterns, and natural elements (trees, animals) in an abstract geometric style. Use earthy colors with vibrant accents. Square format (1:1 aspect ratio) suitable for a learning platform card.',
  'dall-e-3'
FROM warli_slot
ON CONFLICT DO NOTHING;

WITH katkari_slot AS (
  SELECT ms.id
  FROM public.media_slots ms
  JOIN public.page_sections ps ON ms.section_id = ps.id
  JOIN public.pages p ON ps.page_id = p.id
  WHERE p.slug = 'homepage' AND ps.section_key = 'learn_explore' AND ms.slot_key = 'katkari_image'
)

INSERT INTO public.generation_prompts (slot_id, provider, prompt_text, model_name)
SELECT
  katkari_slot.id,
  'openai',
  'A vibrant, colorful illustration representing Katkari tribal culture. Show figures engaged in traditional activities, cultural symbols, forest elements, and patterns. Use warm, rich colors that evoke the Katkari community heritage. Square format (1:1 aspect ratio) for learning platform card.',
  'dall-e-3'
FROM katkari_slot
ON CONFLICT DO NOTHING;

-- =========================================================================
-- 10. Create Voices That Inspire Section
-- =========================================================================

WITH homepage AS (
  SELECT id FROM public.pages WHERE slug = 'homepage'
)

INSERT INTO public.page_sections (page_id, section_key, title, section_type, status)
SELECT homepage.id, 'voices_inspire', 'Voices That Inspire', 'testimonials', 'draft'
FROM homepage
ON CONFLICT (page_id, section_key) DO NOTHING;

-- =========================================================================
-- 11. Create My BhashaSetu Section
-- =========================================================================

WITH homepage AS (
  SELECT id FROM public.pages WHERE slug = 'homepage'
)

INSERT INTO public.page_sections (page_id, section_key, title, section_type, status)
SELECT homepage.id, 'my_bhasha_setu', 'Meet My BhashaSetu', 'featured', 'draft'
FROM homepage
ON CONFLICT (page_id, section_key) DO NOTHING;

-- =========================================================================
-- 12. Create My BhashaSetu Robot Image Slot
-- =========================================================================

WITH chat_section AS (
  SELECT ps.id
  FROM public.page_sections ps
  JOIN public.pages p ON ps.page_id = p.id
  WHERE p.slug = 'homepage' AND ps.section_key = 'my_bhasha_setu'
)

INSERT INTO public.media_slots (section_id, slot_key, media_type, aspect_ratio, slot_position)
SELECT chat_section.id, 'robot_image', 'image', '1:1', 1
FROM chat_section
ON CONFLICT (section_id, slot_key) DO NOTHING;

-- =========================================================================
-- 13. Create Generation Prompt for Robot Image
-- =========================================================================

WITH robot_slot AS (
  SELECT ms.id
  FROM public.media_slots ms
  JOIN public.page_sections ps ON ms.section_id = ps.id
  JOIN public.pages p ON ps.page_id = p.id
  WHERE p.slug = 'homepage' AND ps.section_key = 'my_bhasha_setu' AND ms.slot_key = 'robot_image'
)

INSERT INTO public.generation_prompts (slot_id, provider, prompt_text, model_name)
SELECT
  robot_slot.id,
  'openai',
  'A friendly, cute 3D robot character with a round body and smiling face, designed as a learning companion for students. The robot should have warm, inviting colors (oranges, blues, greens) and a welcoming personality. Show it in a cheerful pose, suitable as a learning assistant. Square format (1:1).',
  'dall-e-3'
FROM robot_slot
ON CONFLICT DO NOTHING;
