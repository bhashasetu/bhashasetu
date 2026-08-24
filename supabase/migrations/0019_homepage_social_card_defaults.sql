-- The homepage had no social card: sharing its link produced a bare text
-- preview. Point it at the hero image slot it already has, so replacing that
-- image in the Back Office updates the card with no second upload.

UPDATE public.pages p
SET og_image_slot_id = ms.id
FROM public.media_slots ms
JOIN public.page_sections ps ON ms.section_id = ps.id
WHERE ps.page_id = p.id
  AND p.slug = 'homepage'
  AND ps.section_key = 'hero'
  AND ms.slot_key = 'hero_image'
  AND p.og_image_slot_id IS NULL;

UPDATE public.pages
SET structured_data_type = 'WebPage'
WHERE slug = 'homepage' AND structured_data_type IS NULL;
