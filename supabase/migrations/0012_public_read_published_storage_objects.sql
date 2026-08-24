-- The media buckets are private and storage.objects only had admin SELECT
-- policies. A public visitor therefore could not create a signed URL for a
-- slot's image, so uploaded media could never appear on the website even once
-- it was attached and published.
--
-- Allow reading an object only when a published media_assets row points at
-- exactly that bucket + path. Draft and archived assets stay unreadable, and
-- the buckets remain private (no blanket public listing).

DROP POLICY IF EXISTS "public_read_published_media_objects" ON storage.objects;

CREATE POLICY "public_read_published_media_objects"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id IN ('media-images', 'media-audio', 'media-video')
  AND EXISTS (
    SELECT 1
    FROM public.media_assets ma
    WHERE ma.storage_bucket = storage.objects.bucket_id
      AND ma.storage_path = storage.objects.name
      AND ma.status = 'published'
  )
);
