-- Comprehensive seed for all CMS pages, sections, slots, and prompts

-- =========================================================================
-- About Page
-- =========================================================================

INSERT INTO public.pages (slug, title, description, status, page_type)
VALUES (
  'about',
  'About Bhasha Setu',
  'Learn about our mission to preserve and celebrate indigenous languages',
  'draft',
  'landing'
) ON CONFLICT (slug) DO NOTHING;

-- =========================================================================
-- WRO Page
-- =========================================================================

INSERT INTO public.pages (slug, title, description, status, page_type)
VALUES (
  'wro',
  'World Robot Olympiad Project',
  'Bridging technology and cultural heritage through robotics education',
  'draft',
  'landing'
) ON CONFLICT (slug) DO NOTHING;

-- =========================================================================
-- Warli Language Profile Page
-- =========================================================================

INSERT INTO public.pages (slug, title, description, status, page_type)
VALUES (
  'language-warli',
  'Warli Language',
  'Explore the Warli language, culture, and traditions',
  'draft',
  'language'
) ON CONFLICT (slug) DO NOTHING;

WITH warli_page AS (
  SELECT id FROM public.pages WHERE slug = 'language-warli'
)
INSERT INTO public.page_sections (page_id, section_key, title, section_type, status)
SELECT warli_page.id, 'header', 'Language Header', 'hero', 'draft'
FROM warli_page
ON CONFLICT (page_id, section_key) DO NOTHING;

WITH header_section AS (
  SELECT ps.id
  FROM public.page_sections ps
  JOIN public.pages p ON ps.page_id = p.id
  WHERE p.slug = 'language-warli' AND ps.section_key = 'header'
)
INSERT INTO public.media_slots (section_id, slot_key, media_type, aspect_ratio, slot_position)
SELECT header_section.id, 'header_image', 'image', '16:9', 1
FROM header_section
ON CONFLICT (section_id, slot_key) DO NOTHING;

WITH header_slot AS (
  SELECT ms.id FROM public.media_slots ms
  JOIN public.page_sections ps ON ms.section_id = ps.id
  JOIN public.pages p ON ps.page_id = p.id
  WHERE p.slug = 'language-warli' AND ms.slot_key = 'header_image'
)
INSERT INTO public.generation_prompts (slot_id, provider, prompt_text, model_name)
SELECT header_slot.id, 'openai',
  'A beautiful illustration representing Warli tribal culture and traditions. Show Warli art style with traditional patterns, village scenes, and cultural elements. Use warm earth tones and tribal motifs. Perfect for a language learning platform header. 16:9 aspect ratio.',
  'dall-e-3'
FROM header_slot
ON CONFLICT DO NOTHING;

-- =========================================================================
-- Katkari Language Profile Page
-- =========================================================================

INSERT INTO public.pages (slug, title, description, status, page_type)
VALUES (
  'language-katkari',
  'Katkari Language',
  'Explore the Katkari language, culture, and traditions',
  'draft',
  'language'
) ON CONFLICT (slug) DO NOTHING;

WITH katkari_page AS (
  SELECT id FROM public.pages WHERE slug = 'language-katkari'
)
INSERT INTO public.page_sections (page_id, section_key, title, section_type, status)
SELECT katkari_page.id, 'header', 'Language Header', 'hero', 'draft'
FROM katkari_page
ON CONFLICT (page_id, section_key) DO NOTHING;

WITH header_section AS (
  SELECT ps.id
  FROM public.page_sections ps
  JOIN public.pages p ON ps.page_id = p.id
  WHERE p.slug = 'language-katkari' AND ps.section_key = 'header'
)
INSERT INTO public.media_slots (section_id, slot_key, media_type, aspect_ratio, slot_position)
SELECT header_section.id, 'header_image', 'image', '16:9', 1
FROM header_section
ON CONFLICT (section_id, slot_key) DO NOTHING;

WITH header_slot AS (
  SELECT ms.id FROM public.media_slots ms
  JOIN public.page_sections ps ON ms.section_id = ps.id
  JOIN public.pages p ON ps.page_id = p.id
  WHERE p.slug = 'language-katkari' AND ms.slot_key = 'header_image'
)
INSERT INTO public.generation_prompts (slot_id, provider, prompt_text, model_name)
SELECT header_slot.id, 'openai',
  'A vibrant illustration representing Katkari tribal community and culture. Show traditional Katkari life, forest elements, and cultural heritage. Use rich, warm colors that evoke Maharashtra and tribal artistry. Perfect for a language learning platform header. 16:9 aspect ratio.',
  'dall-e-3'
FROM header_slot
ON CONFLICT DO NOTHING;

-- =========================================================================
-- Team Page
-- =========================================================================

INSERT INTO public.pages (slug, title, description, status, page_type)
VALUES (
  'team',
  'Our Team',
  'Meet the people dedicated to preserving Warli and Katkari languages',
  'draft',
  'landing'
) ON CONFLICT (slug) DO NOTHING;

WITH team_page AS (
  SELECT id FROM public.pages WHERE slug = 'team'
)
INSERT INTO public.page_sections (page_id, section_key, title, section_type, status)
SELECT team_page.id, 'team_members', 'Team Members', 'media_grid', 'draft'
FROM team_page
ON CONFLICT (page_id, section_key) DO NOTHING;

-- =========================================================================
-- Seed initial prompts for FAL.AI provider
-- =========================================================================

-- Homepage hero with fal.ai
WITH hero_slot AS (
  SELECT ms.id FROM public.media_slots ms
  JOIN public.page_sections ps ON ms.section_id = ps.id
  JOIN public.pages p ON ps.page_id = p.id
  WHERE p.slug = 'homepage' AND ms.slot_key = 'hero_image'
)
INSERT INTO public.generation_prompts (slot_id, provider, prompt_text, model_name)
SELECT hero_slot.id, 'fal.ai',
  'A vibrant, modern illustration of a friendly robot with an art deco lantern-like head, designed for an educational platform. The robot should have warm, welcoming colors (blues, oranges, greens) and be shown in a stylized environment that evokes Warli and Katkari cultural patterns. The style should be friendly and approachable for students.',
  'flux-pro'
FROM hero_slot
ON CONFLICT DO NOTHING;

-- Warli language header with fal.ai
WITH warli_slot AS (
  SELECT ms.id FROM public.media_slots ms
  JOIN public.page_sections ps ON ms.section_id = ps.id
  JOIN public.pages p ON ps.page_id = p.id
  WHERE p.slug = 'language-warli' AND ms.slot_key = 'header_image'
)
INSERT INTO public.generation_prompts (slot_id, provider, prompt_text, model_name)
SELECT warli_slot.id, 'fal.ai',
  'A beautiful illustration representing Warli tribal culture and traditions. Show Warli art style with traditional patterns, village scenes, and cultural elements. Use warm earth tones and tribal motifs.',
  'flux-pro'
FROM warli_slot
ON CONFLICT DO NOTHING;

-- Katkari language header with fal.ai
WITH katkari_slot AS (
  SELECT ms.id FROM public.media_slots ms
  JOIN public.page_sections ps ON ms.section_id = ps.id
  JOIN public.pages p ON ps.page_id = p.id
  WHERE p.slug = 'language-katkari' AND ms.slot_key = 'header_image'
)
INSERT INTO public.generation_prompts (slot_id, provider, prompt_text, model_name)
SELECT katkari_slot.id, 'fal.ai',
  'A vibrant illustration representing Katkari tribal community and culture. Show traditional Katkari life, forest elements, and cultural heritage. Use rich, warm colors that evoke Maharashtra and tribal artistry.',
  'flux-pro'
FROM katkari_slot
ON CONFLICT DO NOTHING;

-- =========================================================================
-- Complete Page Inventory
-- =========================================================================
--
-- PAGES CREATED:
-- 1. homepage - Hero, WRO, Learn, Voices, Chat sections
-- 2. stories-voices - Featured interview, interview grid
-- 3. heritage - Warli heritage, Katkari heritage sections
-- 4. chat - Chat interface placeholder
-- 5. about - About page
-- 6. wro - WRO project page
-- 7. language-warli - Warli language profile
-- 8. language-katkari - Katkari language profile
-- 9. team - Team page with member grid
--
-- PUBLIC ROUTES:
-- / - homepage
-- /learn - Languages list
-- /learn/warli - Warli learning entries
-- /learn/katkari - Katkari learning entries
-- /stories - Stories & Voices
-- /heritage - Cultural heritage
-- /chat - Chat assistant
-- /about - About us
-- /wro - WRO project
-- /language-warli - Warli profile (could use language-warli page)
-- /language-katkari - Katkari profile (could use language-katkari page)
-- /team - Team members
-- /faq - FAQ (static)
-- /download - Download/APK (static)
--
-- MEDIA SLOTS CREATED:
-- Homepage: hero_image (16:9), video (16:9), warli_image (1:1), katkari_image (1:1), interview_* (1:1), robot_image (1:1)
-- Stories: interview_thumbnail (16:9), interview_* (1:1) x6
-- Warli: header_image (16:9)
-- Katkari: header_image (16:9)
--
-- GENERATION PROMPTS SEEDED:
-- - 2x Homepage hero (OpenAI, fal.ai)
-- - 2x Warli learn card (OpenAI)
-- - 2x Katkari learn card (OpenAI)
-- - 1x Robot image (OpenAI)
-- - 2x Warli language header (OpenAI, fal.ai)
-- - 2x Katkari language header (OpenAI, fal.ai)
