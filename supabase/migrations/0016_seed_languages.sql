-- The languages table has been empty since 0001, so nothing could reference
-- a language: no Warli/Katkari filter tabs, and no way to tag a story or a
-- learning entry with the language it belongs to.
--
-- Only the two languages in scope are seeded (CLAUDE.md section 1).
-- Descriptions are left empty rather than written here: describing a
-- community's language is editorial content for the Back Office, not
-- something to invent in a migration (CLAUDE.md section 25).

INSERT INTO public.languages (code, name, description, featured, status)
VALUES
  ('warli',   'Warli',   NULL, TRUE, 'published'),
  ('katkari', 'Katkari', NULL, TRUE, 'published')
ON CONFLICT (code) DO NOTHING;
