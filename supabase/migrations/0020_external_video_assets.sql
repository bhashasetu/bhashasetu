-- A media asset may now be a hosted video (YouTube/Vimeo) rather than a file
-- in a bucket.
--
-- The project is on Supabase's free plan: 50 MB per object and 5 GB of egress
-- a month. A community interview is routinely 50-500 MB, and a few hundred
-- plays of a stored video would exhaust the month's egress. Linking one costs
-- nothing and keeps long recordings possible at all.
--
-- Modelled as a media_assets row rather than a loose URL column, so the Media
-- Library stays the one place media lives (CLAUDE.md section 8) and slots,
-- stories and "where used" keep working with no special case.

ALTER TABLE public.media_assets
  ALTER COLUMN storage_bucket DROP NOT NULL,
  ALTER COLUMN storage_path DROP NOT NULL,
  ALTER COLUMN mime_type DROP NOT NULL,
  ALTER COLUMN file_size DROP NOT NULL;

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS source_url VARCHAR(1000);

-- Every row is one or the other, never neither: relaxing four NOT NULLs
-- without this would allow an asset that points at nothing.
ALTER TABLE public.media_assets
  DROP CONSTRAINT IF EXISTS media_assets_stored_or_external;

ALTER TABLE public.media_assets
  ADD CONSTRAINT media_assets_stored_or_external CHECK (
    (source_type = 'external' AND source_url IS NOT NULL)
    OR (storage_bucket IS NOT NULL AND storage_path IS NOT NULL)
  );

-- media_assets constrained audio and image MIME types but not video, so the
-- one kind that now has a first-class upload path was the one unpoliced kind.
ALTER TABLE public.media_assets
  DROP CONSTRAINT IF EXISTS media_assets_mime_type_video;

ALTER TABLE public.media_assets
  ADD CONSTRAINT media_assets_mime_type_video CHECK (
    media_type <> 'video'
    OR mime_type IS NULL
    OR mime_type IN ('video/mp4', 'video/webm', 'video/quicktime')
  );

COMMENT ON COLUMN public.media_assets.source_url IS
  'For source_type = ''external'': the hosted video URL (YouTube/Vimeo).';
