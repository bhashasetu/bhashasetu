-- hero_image was seeded as 16:9, but the desktop homepage renders it in a
-- 4:3 frame (WEB-01-Homepage.PNG shows the vehicle photo at roughly 1.1:1,
-- far closer to 4:3 than to 16:9). The Back Office therefore cropped uploads
-- to 16:9 and the page then re-cropped that into 4:3, cutting off the bottom
-- of the vehicle.
--
-- The page layout follows the approved reference, so the stored ratio is the
-- incorrect side of the mismatch.

UPDATE public.media_slots ms
SET aspect_ratio = '4:3', updated_at = now()
FROM public.page_sections ps, public.pages p
WHERE ms.section_id = ps.id
  AND ps.page_id = p.id
  AND p.slug = 'homepage'
  AND ms.slot_key = 'hero_image';
