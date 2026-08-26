-- Language Explorer (WEB-04 / MOBILE-01).
--
-- The page a visitor reaches from the desktop nav item "Language Explorer" and
-- from the mobile tab bar's "Explore" tab. Both already point at /languages,
-- and until now /languages was a 404.
--
-- Three things are seeded here: the page furniture (editorial copy and media
-- slots, so nothing on the page is hardcoded — CLAUDE.md section 4), a record
-- of what people search for, and a place for word suggestions to land.
--
-- Deliberately NOT seeded, and why (CLAUDE.md section 25):
--
--   * The hero artwork and the robot. The references show illustrations that
--     have not been supplied, so the slots exist and are empty; the page
--     renders without them (section 10).
--   * Trending words. There is no measurement behind the figure in the
--     reference. The panel shows editor-featured words until the log below has
--     enough real searches to derive trending honestly — and it is labelled
--     "Featured words" while that is what it is.
--   * featured_searches ships with the reference's own example terms because
--     they are ordinary English words the collection is searched by, not
--     claims about Warli or Katkari. An editor can change them.

-- === PAGE ===
-- page_type 'custom': the CHECK allows homepage/about/stories_voices/
-- language_selection/heritage/custom, and 'language_selection' is WEB-08, a
-- different page. 'custom' is the honest fit rather than a borrowed label.
INSERT INTO public.pages (slug, title, description, status, page_type, structured_data_type)
VALUES (
  'language-explorer',
  'Language Explorer',
  'Discover words. Connect cultures. Preserve our shared heritage.',
  'published',
  'custom',
  'CollectionPage'
)
ON CONFLICT (slug) DO UPDATE
  SET status = 'published',
      page_type = 'custom',
      structured_data_type = 'CollectionPage';

-- === SECTIONS ===
INSERT INTO public.page_sections (page_id, section_key, title, section_type, status, display_order)
SELECT p.id, v.section_key, v.title, v.section_type, 'published', v.display_order
FROM public.pages p
JOIN (VALUES
  ('hero',     'Hero',                 'hero',     10),
  ('search',   'Search',               'content',  20),
  ('discover', 'Explore & Discover',   'featured', 30),
  ('suggest',  'Suggest a word',       'content',  40),
  ('trust',    'Verification promise', 'content',  50)
) AS v(section_key, title, section_type, display_order) ON TRUE
WHERE p.slug = 'language-explorer'
ON CONFLICT (page_id, section_key) DO NOTHING;

-- === HERO ===
INSERT INTO public.page_content (section_id, field_key, content, field_type, status)
SELECT ps.id, v.field_key, v.content, 'text', 'published'
FROM public.page_sections ps
JOIN public.pages p ON ps.page_id = p.id
JOIN (VALUES
  ('heading', 'Language Explorer'),
  ('tagline', 'Discover words. Connect cultures. Preserve our shared heritage.')
) AS v(field_key, content) ON TRUE
WHERE p.slug = 'language-explorer' AND ps.section_key = 'hero'
ON CONFLICT (section_id, field_key) DO NOTHING;

-- Two slots, because the desktop band and the mobile card are different
-- shapes: a wide banner behind the title, and a squarer card beside it.
INSERT INTO public.media_slots (section_id, slot_key, media_type, aspect_ratio, slot_position, status, alt_text_template)
SELECT ps.id, v.slot_key, 'image', v.aspect_ratio, v.slot_position, 'published', v.alt_text
FROM public.page_sections ps
JOIN public.pages p ON ps.page_id = p.id
JOIN (VALUES
  ('hero_band', '6:1', 1, 'Warli-style illustration of village life across the page header'),
  ('hero_card', '4:3', 2, 'Warli-style illustration of villagers beside a tree')
) AS v(slot_key, aspect_ratio, slot_position, alt_text) ON TRUE
WHERE p.slug = 'language-explorer' AND ps.section_key = 'hero'
ON CONFLICT (section_id, slot_key) DO NOTHING;

-- === SEARCH ===
INSERT INTO public.page_content (section_id, field_key, content, field_type, status)
SELECT ps.id, v.field_key, v.content, 'text', 'published'
FROM public.page_sections ps
JOIN public.pages p ON ps.page_id = p.id
JOIN (VALUES
  ('placeholder', 'Search for a word or phrase'),
  ('hint',        'Search in English or Hindi.'),
  -- Comma-separated. Rendered as links that run the search.
  ('examples',    'पानी, जंगल, घर, moon, fire')
) AS v(field_key, content) ON TRUE
WHERE p.slug = 'language-explorer' AND ps.section_key = 'search'
ON CONFLICT (section_id, field_key) DO NOTHING;

-- === EXPLORE & DISCOVER ===
INSERT INTO public.page_content (section_id, field_key, content, field_type, status)
SELECT ps.id, v.field_key, v.content, 'text', 'published'
FROM public.page_sections ps
JOIN public.pages p ON ps.page_id = p.id
JOIN (VALUES
  ('heading',           'Explore & Discover'),
  ('searches_heading',  'Featured Searches'),
  -- Comma-separated terms an editor chooses. Ordinary English words, not
  -- claims about either language.
  ('featured_searches', 'water, river, drink, rain, well'),
  ('categories_heading', 'Explore categories'),
  ('categories_blurb',   'Browse words by themes')
) AS v(field_key, content) ON TRUE
WHERE p.slug = 'language-explorer' AND ps.section_key = 'discover'
ON CONFLICT (section_id, field_key) DO NOTHING;

-- === SUGGEST A WORD ===
INSERT INTO public.page_content (section_id, field_key, content, field_type, status)
SELECT ps.id, v.field_key, v.content, 'text', 'published'
FROM public.page_sections ps
JOIN public.pages p ON ps.page_id = p.id
JOIN (VALUES
  ('heading',  'Looking for a word we don''t have?'),
  ('body',     'We do not have this in our learning library yet.'),
  ('note',     'Help us grow! You can suggest this word and help preserve more languages.'),
  ('cta_text', 'Suggest a word')
) AS v(field_key, content) ON TRUE
WHERE p.slug = 'language-explorer' AND ps.section_key = 'suggest'
ON CONFLICT (section_id, field_key) DO NOTHING;

-- === TRUST BAND ===
INSERT INTO public.page_content (section_id, field_key, content, field_type, status)
SELECT ps.id, v.field_key, v.content, 'text', 'published'
FROM public.page_sections ps
JOIN public.pages p ON ps.page_id = p.id
JOIN (VALUES
  ('heading',     'All words are community-verified and recorded by native speakers.'),
  ('body',        'Together, we build bridges between languages and generations.'),
  ('cta_text',    'Learn more about our verification process'),
  ('cta_href',    '/about'),
  -- MOBILE-01 states the promise differently, in the robot card.
  ('mobile_heading', 'We value accuracy and trust.'),
  ('mobile_body',    'If a word is not in our library, we will not invent an answer.')
) AS v(field_key, content) ON TRUE
WHERE p.slug = 'language-explorer' AND ps.section_key = 'trust'
ON CONFLICT (section_id, field_key) DO NOTHING;

-- The approved Bhasha Setu robot (CLAUDE.md section 7): never redrawn, always
-- the supplied asset. Empty until one is uploaded; the card renders without it.
INSERT INTO public.media_slots (section_id, slot_key, media_type, aspect_ratio, slot_position, status, alt_text_template)
SELECT ps.id, 'robot', 'image', '1:1', 1, 'published',
       'The Bhasha Setu robot'
FROM public.page_sections ps
JOIN public.pages p ON ps.page_id = p.id
WHERE p.slug = 'language-explorer' AND ps.section_key = 'trust'
ON CONFLICT (section_id, slot_key) DO NOTHING;

-- === WHAT PEOPLE SEARCH FOR ===
--
-- One row per search. Recorded so "Trending words" can one day be measured
-- rather than asserted, and so the searches that find nothing become a list of
-- what to record next — the same reasoning as chat_unanswered (0024), and the
-- same privacy posture: the query text and nothing else. No visitor id, no IP,
-- no session.
CREATE TABLE IF NOT EXISTS public.search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_text TEXT NOT NULL,
  language_id UUID REFERENCES public.languages(id) ON DELETE SET NULL,
  result_count INT NOT NULL DEFAULT 0,
  searched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_queries_searched_at
  ON public.search_queries (searched_at DESC);
-- Trending reads recent rows that found something, grouped by term.
CREATE INDEX IF NOT EXISTS idx_search_queries_found
  ON public.search_queries (searched_at DESC) WHERE result_count > 0;

-- === SUGGESTED WORDS ===
--
-- The "Suggest a word" panel in WEB-04. A suggestion is a request to record
-- something, never content: nothing here is ever shown on the public site, and
-- nothing here becomes a learning entry without an editor creating one through
-- the normal verification workflow (sections 25, 26).
CREATE TABLE IF NOT EXISTS public.word_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term TEXT NOT NULL,
  language_id UUID REFERENCES public.languages(id) ON DELETE SET NULL,
  meaning TEXT,
  note TEXT,
  contact TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'new',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT word_suggestions_status_valid
    CHECK (status IN ('new', 'reviewed', 'added', 'declined'))
);

CREATE INDEX IF NOT EXISTS idx_word_suggestions_status
  ON public.word_suggestions (status, created_at DESC);

ALTER TABLE public.search_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.word_suggestions ENABLE ROW LEVEL SECURITY;

-- Write-only for the public, exactly as chat_unanswered: a visitor can add to
-- these, and no visitor can read what anyone else searched for or suggested.
CREATE POLICY "public_insert_search_queries" ON public.search_queries
  FOR INSERT WITH CHECK (true);
CREATE POLICY "public_insert_word_suggestions" ON public.word_suggestions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "admin_read_search_queries" ON public.search_queries
  FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_word_suggestions" ON public.word_suggestions
  FOR ALL USING (public.is_admin());

-- === FEATURED WORDS ===
-- learning_entries.featured already exists; nothing has ever read it. The
-- Explore & Discover panel does, so the lookup gets an index.
CREATE INDEX IF NOT EXISTS idx_learning_entries_featured
  ON public.learning_entries (language_id, display_order)
  WHERE featured = TRUE AND status = 'published';
