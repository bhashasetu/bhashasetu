-- Complete Homepage with all sections, slots, content, and generation prompts

-- Ensure homepage exists
INSERT INTO public.pages (slug, title, description, status, page_type)
VALUES (
  'homepage',
  'Bhasha Setu - Learn & Celebrate Indigenous Languages',
  'Bridge to our languages. Bridge to our future. Learn Warli and Katkari through student-built, community-driven platform.',
  'draft',
  'homepage'
) ON CONFLICT (slug) DO NOTHING;

-- Get homepage ID for section insertions
WITH homepage AS (
  SELECT id FROM public.pages WHERE slug = 'homepage'
)
-- HERO SECTION
INSERT INTO public.page_sections (page_id, section_key, title, section_type, status)
SELECT homepage.id, 'hero', 'Hero Section', 'hero', 'draft'
FROM homepage
ON CONFLICT (page_id, section_key) DO NOTHING;

-- Hero section content fields
WITH hero_section AS (
  SELECT ps.id
  FROM public.page_sections ps
  JOIN public.pages p ON ps.page_id = p.id
  WHERE p.slug = 'homepage' AND ps.section_key = 'hero'
)
INSERT INTO public.page_content (section_id, field_key, content, field_type)
SELECT hero_section.id, 'heading', 'Bridge to Our Languages. Bridge to Our Future.', 'text'
FROM hero_section
ON CONFLICT DO NOTHING;

WITH hero_section AS (
  SELECT ps.id
  FROM public.page_sections ps
  JOIN public.pages p ON ps.page_id = p.id
  WHERE p.slug = 'homepage' AND ps.section_key = 'hero'
)
INSERT INTO public.page_content (section_id, field_key, content, field_type)
SELECT hero_section.id, 'description', 'Bhasha Setu is a student-built platform to help the world learn and celebrate the languages of the Warli and Katkari communities.', 'text'
FROM hero_section
ON CONFLICT DO NOTHING;

-- Hero media slot (robot/product image)
WITH hero_section AS (
  SELECT ps.id
  FROM public.page_sections ps
  JOIN public.pages p ON ps.page_id = p.id
  WHERE p.slug = 'homepage' AND ps.section_key = 'hero'
)
INSERT INTO public.media_slots (section_id, slot_key, media_type, aspect_ratio, slot_position)
SELECT hero_section.id, 'hero_image', 'image', '16:9', 1
FROM hero_section
ON CONFLICT (section_id, slot_key) DO NOTHING;

-- Hero image generation prompt
-- NOTE: The hero image in the reference is the REAL WRO vehicle photograph, not AI-generated
-- This slot is for the WRO robot vehicle image - a real photograph with metallic box chassis and lantern top
-- DO NOT AI-GENERATE: Source the approved WRO vehicle photo asset
WITH hero_slot AS (
  SELECT ms.id FROM public.media_slots ms
  JOIN public.page_sections ps ON ms.section_id = ps.id
  JOIN public.pages p ON ps.page_id = p.id
  WHERE p.slug = 'homepage' AND ms.slot_key = 'hero_image'
)
INSERT INTO public.generation_prompts (slot_id, provider, prompt_text, model_name)
SELECT hero_slot.id, 'manual',
  'Use approved WRO vehicle photograph asset. Real photo of the physical robot vehicle with metallic chassis, lantern-shaped top, tracks, and control panel. This is the canonical Bhasha Setu WRO project vehicle - do not generate or recreate.',
  'manual'
FROM hero_slot
ON CONFLICT DO NOTHING;

-- WRO PROJECT SECTION
WITH homepage AS (
  SELECT id FROM public.pages WHERE slug = 'homepage'
)
INSERT INTO public.page_sections (page_id, section_key, title, section_type, status)
SELECT homepage.id, 'wro_project', 'WRO Project Section', 'hero', 'draft'
FROM homepage
ON CONFLICT (page_id, section_key) DO NOTHING;

-- WRO section content
WITH wro_section AS (
  SELECT ps.id
  FROM public.page_sections ps
  JOIN public.pages p ON ps.page_id = p.id
  WHERE p.slug = 'homepage' AND ps.section_key = 'wro_project'
)
INSERT INTO public.page_content (section_id, field_key, content, field_type)
SELECT wro_section.id, 'title', 'Our WRO Project (90 sec)', 'text'
FROM wro_section
ON CONFLICT DO NOTHING;

WITH wro_section AS (
  SELECT ps.id
  FROM public.page_sections ps
  JOIN public.pages p ON ps.page_id = p.id
  WHERE p.slug = 'homepage' AND ps.section_key = 'wro_project'
)
INSERT INTO public.page_content (section_id, field_key, content, field_type)
SELECT wro_section.id, 'description', 'See how we built Bhasha Setu to document, learn, and celebrate the languages of Warli and Katkari.', 'text'
FROM wro_section
ON CONFLICT DO NOTHING;

WITH wro_section AS (
  SELECT ps.id
  FROM public.page_sections ps
  JOIN public.pages p ON ps.page_id = p.id
  WHERE p.slug = 'homepage' AND ps.section_key = 'wro_project'
)
INSERT INTO public.page_content (section_id, field_key, content, field_type)
SELECT wro_section.id, 'cta_text', 'Watch on YouTube', 'text'
FROM wro_section
ON CONFLICT DO NOTHING;

-- WRO media slot (video)
WITH wro_section AS (
  SELECT ps.id
  FROM public.page_sections ps
  JOIN public.pages p ON ps.page_id = p.id
  WHERE p.slug = 'homepage' AND ps.section_key = 'wro_project'
)
INSERT INTO public.media_slots (section_id, slot_key, media_type, aspect_ratio, slot_position)
SELECT wro_section.id, 'wro_video', 'video', '16:9', 1
FROM wro_section
ON CONFLICT (section_id, slot_key) DO NOTHING;

-- LEARN. EXPLORE. CELEBRATE SECTION
WITH homepage AS (
  SELECT id FROM public.pages WHERE slug = 'homepage'
)
INSERT INTO public.page_sections (page_id, section_key, title, section_type, status)
SELECT homepage.id, 'learn_explore', 'Learn. Explore. Celebrate.', 'media_grid', 'draft'
FROM homepage
ON CONFLICT (page_id, section_key) DO NOTHING;

-- Learn section heading
WITH learn_section AS (
  SELECT ps.id
  FROM public.page_sections ps
  JOIN public.pages p ON ps.page_id = p.id
  WHERE p.slug = 'homepage' AND ps.section_key = 'learn_explore'
)
INSERT INTO public.page_content (section_id, field_key, content, field_type)
SELECT learn_section.id, 'heading', 'Learn. Explore. Celebrate.', 'text'
FROM learn_section
ON CONFLICT DO NOTHING;

-- Learn card media slots (4 cards with 1:1 aspect ratio for icons/images)
WITH learn_section AS (
  SELECT ps.id
  FROM public.page_sections ps
  JOIN public.pages p ON ps.page_id = p.id
  WHERE p.slug = 'homepage' AND ps.section_key = 'learn_explore'
)
INSERT INTO public.media_slots (section_id, slot_key, media_type, aspect_ratio, slot_position)
SELECT learn_section.id, 'card_warli_image', 'image', '1:1', 1
FROM learn_section
ON CONFLICT (section_id, slot_key) DO NOTHING;

WITH learn_section AS (
  SELECT ps.id
  FROM public.page_sections ps
  JOIN public.pages p ON ps.page_id = p.id
  WHERE p.slug = 'homepage' AND ps.section_key = 'learn_explore'
)
INSERT INTO public.media_slots (section_id, slot_key, media_type, aspect_ratio, slot_position)
SELECT learn_section.id, 'card_katkari_image', 'image', '1:1', 2
FROM learn_section
ON CONFLICT (section_id, slot_key) DO NOTHING;

WITH learn_section AS (
  SELECT ps.id
  FROM public.page_sections ps
  JOIN public.pages p ON ps.page_id = p.id
  WHERE p.slug = 'homepage' AND ps.section_key = 'learn_explore'
)
INSERT INTO public.media_slots (section_id, slot_key, media_type, aspect_ratio, slot_position)
SELECT learn_section.id, 'card_play_image', 'image', '1:1', 3
FROM learn_section
ON CONFLICT (section_id, slot_key) DO NOTHING;

WITH learn_section AS (
  SELECT ps.id
  FROM public.page_sections ps
  JOIN public.pages p ON ps.page_id = p.id
  WHERE p.slug = 'homepage' AND ps.section_key = 'learn_explore'
)
INSERT INTO public.media_slots (section_id, slot_key, media_type, aspect_ratio, slot_position)
SELECT learn_section.id, 'card_stories_image', 'image', '1:1', 4
FROM learn_section
ON CONFLICT (section_id, slot_key) DO NOTHING;

-- VOICES THAT INSPIRE SECTION
WITH homepage AS (
  SELECT id FROM public.pages WHERE slug = 'homepage'
)
INSERT INTO public.page_sections (page_id, section_key, title, section_type, status)
SELECT homepage.id, 'voices_inspire', 'Voices That Inspire', 'media_grid', 'draft'
FROM homepage
ON CONFLICT (page_id, section_key) DO NOTHING;

-- Voices section heading
WITH voices_section AS (
  SELECT ps.id
  FROM public.page_sections ps
  JOIN public.pages p ON ps.page_id = p.id
  WHERE p.slug = 'homepage' AND ps.section_key = 'voices_inspire'
)
INSERT INTO public.page_content (section_id, field_key, content, field_type)
SELECT voices_section.id, 'heading', 'Voices That Inspire', 'text'
FROM voices_section
ON CONFLICT DO NOTHING;

-- Testimonial media slots (3 testimonials with 1:1 photos)
WITH voices_section AS (
  SELECT ps.id
  FROM public.page_sections ps
  JOIN public.pages p ON ps.page_id = p.id
  WHERE p.slug = 'homepage' AND ps.section_key = 'voices_inspire'
)
INSERT INTO public.media_slots (section_id, slot_key, media_type, aspect_ratio, slot_position)
SELECT voices_section.id, 'testimonial_1_image', 'image', '1:1', 1
FROM voices_section
ON CONFLICT (section_id, slot_key) DO NOTHING;

WITH voices_section AS (
  SELECT ps.id
  FROM public.page_sections ps
  JOIN public.pages p ON ps.page_id = p.id
  WHERE p.slug = 'homepage' AND ps.section_key = 'voices_inspire'
)
INSERT INTO public.media_slots (section_id, slot_key, media_type, aspect_ratio, slot_position)
SELECT voices_section.id, 'testimonial_2_image', 'image', '1:1', 2
FROM voices_section
ON CONFLICT (section_id, slot_key) DO NOTHING;

WITH voices_section AS (
  SELECT ps.id
  FROM public.page_sections ps
  JOIN public.pages p ON ps.page_id = p.id
  WHERE p.slug = 'homepage' AND ps.section_key = 'voices_inspire'
)
INSERT INTO public.media_slots (section_id, slot_key, media_type, aspect_ratio, slot_position)
SELECT voices_section.id, 'testimonial_3_image', 'image', '1:1', 3
FROM voices_section
ON CONFLICT (section_id, slot_key) DO NOTHING;

-- MY BHASHASETU SECTION
WITH homepage AS (
  SELECT id FROM public.pages WHERE slug = 'homepage'
)
INSERT INTO public.page_sections (page_id, section_key, title, section_type, status)
SELECT homepage.id, 'my_bhasha_setu', 'Meet My BhashaSetu', 'hero', 'draft'
FROM homepage
ON CONFLICT (page_id, section_key) DO NOTHING;

-- My BhashaSetu content
WITH chat_section AS (
  SELECT ps.id
  FROM public.page_sections ps
  JOIN public.pages p ON ps.page_id = p.id
  WHERE p.slug = 'homepage' AND ps.section_key = 'my_bhasha_setu'
)
INSERT INTO public.page_content (section_id, field_key, content, field_type)
SELECT chat_section.id, 'title', 'Meet My BhashaSetu', 'text'
FROM chat_section
ON CONFLICT DO NOTHING;

WITH chat_section AS (
  SELECT ps.id
  FROM public.page_sections ps
  JOIN public.pages p ON ps.page_id = p.id
  WHERE p.slug = 'homepage' AND ps.section_key = 'my_bhasha_setu'
)
INSERT INTO public.page_content (section_id, field_key, content, field_type)
SELECT chat_section.id, 'description', 'Chat with our AI assistant in simple English or your language. Ask questions • Explore stories • Record your voice', 'text'
FROM chat_section
ON CONFLICT DO NOTHING;

-- My BhashaSetu robot image slot
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

-- Robot image generation prompt
-- NOTE: Use the approved canonical Bhasha Setu robot asset - the official robot character for the platform
-- Maintain visual identity and brand consistency. Do not generate or recreate.
WITH robot_slot AS (
  SELECT ms.id FROM public.media_slots ms
  JOIN public.page_sections ps ON ms.section_id = ps.id
  JOIN public.pages p ON ps.page_id = p.id
  WHERE p.slug = 'homepage' AND ms.slot_key = 'robot_image'
)
INSERT INTO public.generation_prompts (slot_id, provider, prompt_text, model_name)
SELECT robot_slot.id, 'manual',
  'Use the approved canonical Bhasha Setu robot asset. The friendly robot mascot that represents the learning companion. This is the official robot character for the platform - maintain visual identity and brand consistency.',
  'manual'
FROM robot_slot
ON CONFLICT DO NOTHING;

-- Generation prompts for learn card images
WITH warli_slot AS (
  SELECT ms.id FROM public.media_slots ms
  JOIN public.page_sections ps ON ms.section_id = ps.id
  JOIN public.pages p ON ps.page_id = p.id
  WHERE p.slug = 'homepage' AND ms.slot_key = 'card_warli_image'
)
INSERT INTO public.generation_prompts (slot_id, provider, prompt_text, model_name)
SELECT warli_slot.id, 'fal.ai',
  'Minimalist educational illustration of Warli art and community. Simple geometric shapes and figures in warm earth tones (browns, terracottas, ochres). Hand-drawn style, culturally respectful. Square 1:1 aspect ratio. Perfect for a learning card.',
  'flux-pro'
FROM warli_slot
ON CONFLICT DO NOTHING;

WITH katkari_slot AS (
  SELECT ms.id FROM public.media_slots ms
  JOIN public.page_sections ps ON ms.section_id = ps.id
  JOIN public.pages p ON ps.page_id = p.id
  WHERE p.slug = 'homepage' AND ms.slot_key = 'card_katkari_image'
)
INSERT INTO public.generation_prompts (slot_id, provider, prompt_text, model_name)
SELECT katkari_slot.id, 'fal.ai',
  'Minimalist educational illustration of Katkari cultural heritage and community. Simple geometric shapes, warm palette, hand-drawn style. Culturally respectful and community-focused. Square 1:1 aspect ratio. Perfect for a learning card.',
  'flux-pro'
FROM katkari_slot
ON CONFLICT DO NOTHING;

WITH play_slot AS (
  SELECT ms.id FROM public.media_slots ms
  JOIN public.page_sections ps ON ms.section_id = ps.id
  JOIN public.pages p ON ps.page_id = p.id
  WHERE p.slug = 'homepage' AND ms.slot_key = 'card_play_image'
)
INSERT INTO public.generation_prompts (slot_id, provider, prompt_text, model_name)
SELECT play_slot.id, 'fal.ai',
  'Minimalist illustration representing games, quizzes and interactive learning activities. Simple shapes, warm palette, playful aesthetic. Hand-drawn style. Square 1:1 aspect ratio. Perfect for a learning card.',
  'flux-pro'
FROM play_slot
ON CONFLICT DO NOTHING;

WITH stories_slot AS (
  SELECT ms.id FROM public.media_slots ms
  JOIN public.page_sections ps ON ms.section_id = ps.id
  JOIN public.pages p ON ps.page_id = p.id
  WHERE p.slug = 'homepage' AND ms.slot_key = 'card_stories_image'
)
INSERT INTO public.generation_prompts (slot_id, provider, prompt_text, model_name)
SELECT stories_slot.id, 'fal.ai',
  'Minimalist illustration representing stories and oral tradition. Simple shapes, warm palette, narrative aesthetic. Hand-drawn style. Square 1:1 aspect ratio. Perfect for a learning card.',
  'flux-pro'
FROM stories_slot
ON CONFLICT DO NOTHING;

-- Summary
-- HOMEPAGE STRUCTURE:
-- 1. Hero Section: heading, description, hero_image (16:9)
-- 2. WRO Project: title, description, wro_video (16:9)
-- 3. Learn. Explore. Celebrate: 4 card image slots (1:1)
-- 4. Voices That Inspire: 3 testimonial photo slots (1:1)
-- 5. My BhashaSetu: title, description, robot_image (1:1)
-- 6. Generation Prompts: hero_image (OpenAI + fal.ai), robot_image (OpenAI + fal.ai)
