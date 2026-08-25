-- Framing becomes a property of the asset, decided at render time, instead of
-- being cropped into the stored file at upload time.
--
-- Until now conformImageToSlot centre-cropped every photograph to the ratio of
-- whichever slot it was first uploaded against. That threw pixels away
-- permanently, locked the asset to one ratio, and left the crop to sharp's
-- saliency guess — so a speaker standing off-centre could lose their head, and
-- no editor could correct it without preparing a new file by hand.
--
-- CLAUDE.md section 9 already lists focal point as required image metadata; it
-- was never built. With it, one upload frames correctly in every slot it is
-- used in, at every viewport, including slots that do not exist yet.
--
--   focal_x / focal_y  the point that must stay in shot, 0..1 from top-left.
--                      Feeds CSS object-position, so the browser crops around
--                      it at whatever size the frame happens to be.
--   fit                'cover' for a photograph, which fills its frame and may
--                      be cropped; 'contain' for a cut-out, which must be seen
--                      whole. Defaulted from whether the file has an alpha
--                      channel, and overridable by an editor.
--
-- Existing rows default to dead centre and 'cover', which is exactly how they
-- render today, so nothing moves until someone sets a point or re-uploads.

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS focal_x NUMERIC(4, 3) NOT NULL DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS focal_y NUMERIC(4, 3) NOT NULL DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS fit VARCHAR(20) NOT NULL DEFAULT 'cover';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'media_assets_focal_range'
  ) THEN
    ALTER TABLE public.media_assets
      ADD CONSTRAINT media_assets_focal_range CHECK (
        focal_x >= 0 AND focal_x <= 1 AND focal_y >= 0 AND focal_y <= 1
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'media_assets_fit_valid'
  ) THEN
    ALTER TABLE public.media_assets
      ADD CONSTRAINT media_assets_fit_valid CHECK (fit IN ('cover', 'contain'));
  END IF;
END $$;

COMMENT ON COLUMN public.media_assets.focal_x IS
  'Horizontal focal point, 0..1 from the left. Drives CSS object-position so a crop keeps the subject in shot at any frame ratio.';
COMMENT ON COLUMN public.media_assets.focal_y IS
  'Vertical focal point, 0..1 from the top.';
COMMENT ON COLUMN public.media_assets.fit IS
  'cover: a photograph, fills its frame and may be cropped. contain: a cut-out, shown whole and anchored by the focal point.';
