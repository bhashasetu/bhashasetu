-- Private storage buckets for Bhasha Setu media.
-- public = false: no direct public object access; all delivery goes
-- through server-generated signed URLs (see src/lib/media/url-generator.ts).

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('media-audio', 'media-audio', false),
  ('media-images', 'media-images', false),
  ('media-video', 'media-video', false)
ON CONFLICT (id) DO NOTHING;

-- Admin-only upload/update/delete via back_office_users role check.
-- SELECT is intentionally NOT granted broadly here: signed URLs are
-- generated server-side using the service role / RLS-aware server
-- client, not by querying storage.objects directly from the client.

CREATE POLICY "admin_upload_audio" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'media-audio' AND
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM public.back_office_users WHERE id = auth.uid() AND role = 'admin' AND is_active = TRUE)
  );

CREATE POLICY "admin_update_audio" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'media-audio' AND
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM public.back_office_users WHERE id = auth.uid() AND role = 'admin' AND is_active = TRUE)
  );

CREATE POLICY "admin_delete_audio" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'media-audio' AND
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM public.back_office_users WHERE id = auth.uid() AND role = 'admin' AND is_active = TRUE)
  );

CREATE POLICY "admin_upload_images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'media-images' AND
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM public.back_office_users WHERE id = auth.uid() AND role = 'admin' AND is_active = TRUE)
  );

CREATE POLICY "admin_update_images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'media-images' AND
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM public.back_office_users WHERE id = auth.uid() AND role = 'admin' AND is_active = TRUE)
  );

CREATE POLICY "admin_delete_images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'media-images' AND
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM public.back_office_users WHERE id = auth.uid() AND role = 'admin' AND is_active = TRUE)
  );

CREATE POLICY "admin_upload_video" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'media-video' AND
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM public.back_office_users WHERE id = auth.uid() AND role = 'admin' AND is_active = TRUE)
  );

CREATE POLICY "admin_update_video" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'media-video' AND
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM public.back_office_users WHERE id = auth.uid() AND role = 'admin' AND is_active = TRUE)
  );

CREATE POLICY "admin_delete_video" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'media-video' AND
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM public.back_office_users WHERE id = auth.uid() AND role = 'admin' AND is_active = TRUE)
  );

-- Admin SELECT access for Back Office previews/downloads.
CREATE POLICY "admin_select_audio" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'media-audio' AND
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM public.back_office_users WHERE id = auth.uid() AND role = 'admin' AND is_active = TRUE)
  );

CREATE POLICY "admin_select_images" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'media-images' AND
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM public.back_office_users WHERE id = auth.uid() AND role = 'admin' AND is_active = TRUE)
  );

CREATE POLICY "admin_select_video" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'media-video' AND
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM public.back_office_users WHERE id = auth.uid() AND role = 'admin' AND is_active = TRUE)
  );
