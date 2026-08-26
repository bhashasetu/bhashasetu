-- Heritage page seed.
--
-- This file previously also seeded a 'stories-voices' page and a 'chat' page.
-- Both were rejected by the schema's own CHECK constraints and so this
-- migration had never run:
--
--   * pages.page_type 'stories'  -> not in pages_type_valid (the legal value
--     is 'stories_voices')
--   * pages.page_type 'chat'     -> not in pages_type_valid at all
--   * page_sections.section_type 'chat' -> not in page_sections_type_valid
--
-- Because 0006 aborted, every later migration in a fresh `supabase db reset`
-- was unreachable too; production only has a homepage because 0008+ were
-- applied out of band. The offending inserts are removed here rather than
-- corrected:
--
--   * Stories & Voices is seeded properly by 0017, against the real content
--     model. Its old shape here (a 'featured_interview' section plus six
--     fixed 'interview_N' media slots) modelled an unbounded, editor-created
--     collection as fixed page furniture, which the `stories` table replaces.
--   * /chat is code-managed (CLAUDE.md section 4); it needs no page record.

INSERT INTO public.pages (slug, title, description, status, page_type)
VALUES (
  'heritage',
  'Our Heritage',
  'Learn about the cultural heritage of Warli and Katkari communities',
  'draft',
  'heritage'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.page_sections (page_id, section_key, title, section_type, status)
SELECT p.id, 'warli_heritage', 'Warli Culture & Heritage', 'content', 'draft'
FROM public.pages p WHERE p.slug = 'heritage'
ON CONFLICT (page_id, section_key) DO NOTHING;

INSERT INTO public.page_sections (page_id, section_key, title, section_type, status)
SELECT p.id, 'katkari_heritage', 'Katkari Culture & Heritage', 'content', 'draft'
FROM public.pages p WHERE p.slug = 'heritage'
ON CONFLICT (page_id, section_key) DO NOTHING;
