-- The Stories & Voices content type (CLAUDE.md section 13, module 7).
--
-- The homepage models its media as media_slots: a fixed set of positions in a
-- fixed layout. Stories & Voices lists a growing, editor-created collection
-- that visitors filter by language, theme, format and age, so slots are the
-- wrong shape for it — a slot per interview would push row-count-variable
-- data into the page-layout tables.
--
-- Media is referenced by direct foreign key rather than through media_slots
-- or media_links:
--
--   * RLS on slot_media_assignments gates on the *page* being published, so a
--     draft story's media would go public the moment the page did.
--   * media_links is a many-to-many bag needing a discriminator and able to
--     hold duplicates, whereas a story has exactly one thumbnail and one
--     primary audio/video asset.
--   * ON DELETE SET NULL, so archiving an asset never cascades away the
--     editorial record.

CREATE TABLE IF NOT EXISTS public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  format VARCHAR(50) NOT NULL,

  speaker_name VARCHAR(255),
  speaker_role VARCHAR(255),
  speaker_place VARCHAR(255),
  summary TEXT,
  transcript TEXT,

  language_id UUID REFERENCES public.languages(id) ON DELETE SET NULL,
  theme VARCHAR(100),
  age_group VARCHAR(50),

  thumbnail_asset_id UUID REFERENCES public.media_assets(id) ON DELETE SET NULL,
  media_asset_id UUID REFERENCES public.media_assets(id) ON DELETE SET NULL,
  duration_seconds INTEGER,

  recorded_on DATE,
  recorded_by VARCHAR(255),
  consent_confirmed BOOLEAN NOT NULL DEFAULT FALSE,

  featured BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,

  meta_title VARCHAR(255),
  meta_description VARCHAR(500),

  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT stories_status_valid CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT stories_format_valid CHECK (format IN ('interview', 'audio', 'song')),
  CONSTRAINT stories_duration_nonneg CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  -- The archive's own promise to the communities it records is that nothing
  -- is published without consent. Enforced here, not only in the form.
  CONSTRAINT stories_published_requires_consent
    CHECK (status <> 'published' OR consent_confirmed)
);

CREATE INDEX IF NOT EXISTS idx_stories_public ON public.stories(status, format, display_order);
CREATE INDEX IF NOT EXISTS idx_stories_language ON public.stories(language_id);
CREATE INDEX IF NOT EXISTS idx_stories_theme ON public.stories(theme);
CREATE INDEX IF NOT EXISTS idx_stories_featured ON public.stories(featured) WHERE featured;

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS public_read_published_stories ON public.stories;
CREATE POLICY public_read_published_stories ON public.stories
  FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS admin_full_stories ON public.stories;
CREATE POLICY admin_full_stories ON public.stories
  FOR ALL USING (is_admin());

DROP TRIGGER IF EXISTS update_stories_updated_at ON public.stories;
CREATE TRIGGER update_stories_updated_at
  BEFORE UPDATE ON public.stories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON COLUMN public.stories.format IS
  'interview = video conversation, audio = short clip, song = recorded song.';
COMMENT ON COLUMN public.stories.consent_confirmed IS
  'Recorded consent from the speaker. Publishing without it is refused by CHECK.';
