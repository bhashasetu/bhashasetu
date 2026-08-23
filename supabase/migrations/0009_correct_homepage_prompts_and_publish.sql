-- Correct the homepage generation prompts and publish the homepage.
--
-- 0008 was applied to the database before its prompt text was corrected, so the
-- live rows still carried AI prompts for slots that must use canonical assets.
--
-- 1. hero_image and robot_image are CANONICAL assets, not AI-generated.
--    Replace the AI provider rows (openai/dall-e-3, fal.ai/flux-pro) with a
--    single provider='manual' row each.
-- 2. The four Learn cards had no prompts at all; add fal.ai/flux-pro presets.
-- 3. Publish page, sections, content and slots so the public RLS policies
--    (which gate on status = 'published') expose them to anonymous visitors.

-- === 1. HERO IMAGE: canonical WRO vehicle photograph ===
DELETE FROM public.generation_prompts gp
USING public.media_slots ms, public.page_sections ps, public.pages p
WHERE gp.slot_id = ms.id
  AND ms.section_id = ps.id
  AND ps.page_id = p.id
  AND p.slug = 'homepage'
  AND ms.slot_key = 'hero_image';

INSERT INTO public.generation_prompts (slot_id, provider, prompt_text, model_name)
SELECT ms.id, 'manual',
  'Use approved WRO vehicle photograph asset. Real photo of the physical robot vehicle with metallic chassis, lantern-shaped top, tracks, and control panel. This is the canonical Bhasha Setu WRO project vehicle - do not generate or recreate.',
  'manual'
FROM public.media_slots ms
JOIN public.page_sections ps ON ms.section_id = ps.id
JOIN public.pages p ON ps.page_id = p.id
WHERE p.slug = 'homepage' AND ms.slot_key = 'hero_image';

-- === 2. ROBOT IMAGE: canonical Bhasha Setu robot asset ===
DELETE FROM public.generation_prompts gp
USING public.media_slots ms, public.page_sections ps, public.pages p
WHERE gp.slot_id = ms.id
  AND ms.section_id = ps.id
  AND ps.page_id = p.id
  AND p.slug = 'homepage'
  AND ms.slot_key = 'robot_image';

INSERT INTO public.generation_prompts (slot_id, provider, prompt_text, model_name)
SELECT ms.id, 'manual',
  'Use the approved canonical Bhasha Setu robot asset. The friendly robot mascot that represents the learning companion. This is the official robot character for the platform - maintain visual identity and brand consistency.',
  'manual'
FROM public.media_slots ms
JOIN public.page_sections ps ON ms.section_id = ps.id
JOIN public.pages p ON ps.page_id = p.id
WHERE p.slug = 'homepage' AND ms.slot_key = 'robot_image';

-- === 3. LEARN CARD PROMPTS (fal.ai / FLUX) ===
INSERT INTO public.generation_prompts (slot_id, provider, prompt_text, model_name)
SELECT ms.id, 'fal.ai', v.prompt_text, 'flux-pro'
FROM public.media_slots ms
JOIN public.page_sections ps ON ms.section_id = ps.id
JOIN public.pages p ON ps.page_id = p.id
JOIN (VALUES
  ('card_warli_image',
   'Minimalist educational illustration of Warli art and community. Simple geometric shapes and figures in warm earth tones (browns, terracottas, ochres). Hand-drawn style, culturally respectful. Square 1:1 aspect ratio. Perfect for a learning card. No text, no watermarks, no photorealism.'),
  ('card_katkari_image',
   'Minimalist educational illustration of Katkari cultural heritage and community. Simple geometric shapes, warm palette, hand-drawn style. Culturally respectful and community-focused. Square 1:1 aspect ratio. Perfect for a learning card. No text, no watermarks, no photorealism.'),
  ('card_play_image',
   'Minimalist illustration representing games, quizzes and interactive learning activities. Simple shapes, warm palette, playful aesthetic. Hand-drawn style. Square 1:1 aspect ratio. Perfect for a learning card. No text, no watermarks, no photorealism.'),
  ('card_stories_image',
   'Minimalist illustration representing stories and oral tradition. Simple shapes, warm palette, narrative aesthetic. Hand-drawn style. Square 1:1 aspect ratio. Perfect for a learning card. No text, no watermarks, no photorealism.')
) AS v(slot_key, prompt_text) ON v.slot_key = ms.slot_key::text
WHERE p.slug = 'homepage'
  AND NOT EXISTS (
    SELECT 1 FROM public.generation_prompts g WHERE g.slot_id = ms.id
  );

-- === 4. PUBLISH ===
UPDATE public.page_content pc SET status = 'published', updated_at = now()
FROM public.page_sections ps, public.pages p
WHERE pc.section_id = ps.id AND ps.page_id = p.id AND p.slug = 'homepage';

UPDATE public.media_slots ms SET status = 'published', updated_at = now()
FROM public.page_sections ps, public.pages p
WHERE ms.section_id = ps.id AND ps.page_id = p.id AND p.slug = 'homepage';

UPDATE public.page_sections ps SET status = 'published', updated_at = now()
FROM public.pages p
WHERE ps.page_id = p.id AND p.slug = 'homepage';

UPDATE public.pages
SET status = 'published', published_at = COALESCE(published_at, now()), updated_at = now()
WHERE slug = 'homepage';
