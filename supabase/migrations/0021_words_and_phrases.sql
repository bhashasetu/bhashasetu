-- Words & Phrases module (ADMIN-02). Only what the module genuinely requires.

-- entry_type has defaulted to 'word' since 0001 but was never constrained.
-- The Word/Phrase filter and the Total Words / Total Phrases cards both assume
-- exactly two values, so an unconstrained column means a typo silently creates
-- a third bucket that no filter shows and no card counts.
UPDATE public.learning_entries
SET entry_type = 'word'
WHERE entry_type IS NULL OR entry_type NOT IN ('word', 'phrase');

ALTER TABLE public.learning_entries
  ALTER COLUMN entry_type SET NOT NULL;

ALTER TABLE public.learning_entries
  DROP CONSTRAINT IF EXISTS learning_entries_entry_type_valid;

ALTER TABLE public.learning_entries
  ADD CONSTRAINT learning_entries_entry_type_valid
    CHECK (entry_type IN ('word', 'phrase'));

-- The approved list shows a "by <person>" byline against Last Updated. The
-- table records created_by and verified_by but never who last edited, so that
-- half of the column could not be rendered truthfully.
ALTER TABLE public.learning_entries
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Counting words against phrases is the one filter with no supporting index.
CREATE INDEX IF NOT EXISTS idx_learning_entries_entry_type
  ON public.learning_entries (entry_type);

-- Categories were empty, and learning_entries.category_id is NOT NULL — so no
-- word could be created at all. These eight are organisational labels for
-- filing entries, not language content: nothing here asserts anything about
-- Warli or Katkari vocabulary, grammar or culture (CLAUDE.md section 25).
-- Editors can rename, add or archive them in the Categories module.
INSERT INTO public.categories (language_id, name, display_order, status)
SELECT l.id, c.name, c.display_order, 'published'
FROM public.languages l
CROSS JOIN (VALUES
  ('Greetings',     10),
  ('Relationships', 20),
  ('Nature',        30),
  ('Food',          40),
  ('Phrases',       50),
  ('General',       60),
  ('Questions',     70),
  ('Body',          80)
) AS c(name, display_order)
WHERE l.status = 'published'
ON CONFLICT (language_id, name) DO NOTHING;

COMMENT ON COLUMN public.learning_entries.entry_type IS
  'word or phrase. Drives the Words & Phrases filter and summary counts.';
COMMENT ON COLUMN public.learning_entries.updated_by IS
  'Who last edited the entry, for the Last Updated byline.';
