-- SEO / AEO fields on pages (CLAUDE.md section 15).
--
-- pages already carried meta_title / meta_description / meta_keywords but
-- nothing read them: there is no generateMetadata anywhere in the app, so
-- every page currently serves the one static title from the root layout.
-- These columns complete the set the Back Office needs to expose.
--
-- og_image_slot_id points at a media_slots row rather than a media_assets
-- row on purpose: slot_key is unique only per section, so a key would need a
-- companion section key, and pointing at the slot means replacing the hero
-- image in the Back Office updates the Open Graph image automatically
-- instead of drifting.

ALTER TABLE public.pages
  ADD COLUMN IF NOT EXISTS canonical_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS og_title VARCHAR(255),
  ADD COLUMN IF NOT EXISTS og_description VARCHAR(500),
  ADD COLUMN IF NOT EXISTS og_image_slot_id UUID REFERENCES public.media_slots(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS noindex BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS page_summary TEXT,
  ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS structured_data_type VARCHAR(50);

ALTER TABLE public.pages
  DROP CONSTRAINT IF EXISTS pages_structured_data_valid;

ALTER TABLE public.pages
  ADD CONSTRAINT pages_structured_data_valid
    CHECK (
      structured_data_type IS NULL
      OR structured_data_type IN ('WebPage', 'CollectionPage', 'AboutPage', 'FAQPage')
    );

COMMENT ON COLUMN public.pages.og_image_slot_id IS
  'Media slot whose published asset is used as the Open Graph image.';
COMMENT ON COLUMN public.pages.noindex IS
  'When true the page is excluded from the sitemap and served noindex.';
