-- Bhasha Setu — Phase 1 vertical slice schema
-- Tables, indexes, RLS, storage policies, helper functions, triggers.

-- =========================================================================
-- 1. TABLES
-- =========================================================================

CREATE TABLE public.languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  featured BOOLEAN DEFAULT FALSE,
  status VARCHAR(50) DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT languages_status_valid CHECK (status IN ('draft', 'published', 'archived'))
);

CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language_id UUID NOT NULL REFERENCES public.languages(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon_name VARCHAR(100),
  display_order INT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(language_id, name),
  CONSTRAINT categories_status_valid CHECK (status IN ('draft', 'published', 'archived'))
);

CREATE TABLE public.learning_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language_id UUID NOT NULL REFERENCES public.languages(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  native_text VARCHAR(500) NOT NULL,
  transliteration VARCHAR(500),
  english_meaning VARCHAR(500) NOT NULL,
  hindi_meaning VARCHAR(500),
  entry_type VARCHAR(50) DEFAULT 'word',
  region VARCHAR(255),
  speaker_notes TEXT,
  verified BOOLEAN DEFAULT FALSE,
  featured BOOLEAN DEFAULT FALSE,
  status VARCHAR(50) DEFAULT 'draft',
  published_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  display_order INT DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT learning_entries_status_valid CHECK (status IN ('draft', 'pending_verification', 'verified', 'published', 'archived')),
  CONSTRAINT learning_entries_verified_requires_published CHECK ((status = 'published' AND verified = TRUE) OR status != 'published')
);

CREATE TABLE public.learning_entry_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learning_entry_id UUID NOT NULL REFERENCES public.learning_entries(id) ON DELETE CASCADE,
  alias VARCHAR(500) NOT NULL,
  language_id UUID NOT NULL REFERENCES public.languages(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(learning_entry_id, alias)
);

CREATE TABLE public.media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size INT NOT NULL,
  storage_bucket VARCHAR(100) NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  title VARCHAR(500),
  description TEXT,
  alt_text VARCHAR(1000),
  caption TEXT,
  credit VARCHAR(500),
  source_type VARCHAR(100),
  media_type VARCHAR(50) NOT NULL,
  duration_seconds INT,
  width INT,
  height INT,
  status VARCHAR(50) DEFAULT 'draft',
  published_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT media_assets_media_type_valid CHECK (media_type IN ('audio', 'image', 'video')),
  CONSTRAINT media_assets_status_valid CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT media_assets_mime_type_audio CHECK (
    (media_type = 'audio' AND mime_type IN ('audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/x-wav', 'audio/ogg')) OR
    media_type != 'audio'
  ),
  CONSTRAINT media_assets_mime_type_image CHECK (
    (media_type = 'image' AND mime_type IN ('image/jpeg', 'image/png', 'image/webp', 'image/svg+xml')) OR
    media_type != 'image'
  )
);

CREATE TABLE public.audio_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_asset_id UUID NOT NULL UNIQUE REFERENCES public.media_assets(id) ON DELETE CASCADE,
  speaker_name VARCHAR(255),
  speaker_code VARCHAR(50),
  region VARCHAR(255),
  recording_date DATE,
  recording_source VARCHAR(255),
  consent_status VARCHAR(100),
  playback_permission VARCHAR(100) DEFAULT 'public',
  quality_rating VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.media_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_asset_id UUID NOT NULL REFERENCES public.media_assets(id) ON DELETE CASCADE,
  linked_entry_type VARCHAR(100) NOT NULL,
  linked_entry_id UUID NOT NULL,
  link_type VARCHAR(100) NOT NULL,
  link_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(media_asset_id, linked_entry_type, linked_entry_id, link_type)
);

CREATE TABLE public.back_office_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  full_name VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT back_office_users_role_valid CHECK (role IN ('admin', 'editor', 'viewer'))
);

CREATE TABLE public.verification_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learning_entry_id UUID NOT NULL REFERENCES public.learning_entries(id) ON DELETE CASCADE,
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  verified_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =========================================================================
-- 2. INDEXES (13 total; PK/UNIQUE-covered columns intentionally omitted)
-- =========================================================================

CREATE INDEX idx_languages_status ON public.languages(status);

CREATE INDEX idx_categories_status ON public.categories(status);

CREATE INDEX idx_learning_entries_language_id ON public.learning_entries(language_id);
CREATE INDEX idx_learning_entries_category_id ON public.learning_entries(category_id);
CREATE INDEX idx_learning_entries_status ON public.learning_entries(status);
CREATE INDEX idx_learning_entries_native_text ON public.learning_entries(native_text);

CREATE INDEX idx_learning_entry_aliases_search ON public.learning_entry_aliases(language_id, alias);

CREATE INDEX idx_media_assets_media_type ON public.media_assets(media_type);
CREATE INDEX idx_media_assets_status ON public.media_assets(status);

CREATE INDEX idx_media_links_media_asset_id ON public.media_links(media_asset_id);
CREATE INDEX idx_media_links_target ON public.media_links(linked_entry_type, linked_entry_id);

CREATE INDEX idx_back_office_users_role ON public.back_office_users(role);

CREATE INDEX idx_verification_audit_log_entry_id ON public.verification_audit_log(learning_entry_id);

-- =========================================================================
-- 3. HELPER FUNCTIONS
-- =========================================================================

-- Non-recursive admin check. SECURITY DEFINER with empty search_path;
-- every reference is fully schema-qualified.
CREATE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.back_office_users
    WHERE id = auth.uid()
      AND role = 'admin'
      AND is_active = TRUE
  );
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = '';

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM public;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;

-- Reusable updated_at trigger. No elevated privileges required.
CREATE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- Polymorphic media_links target validation.
-- Only 'learning_entry' is a supported linked_entry_type in this phase;
-- every other value is rejected outright.
CREATE FUNCTION public.validate_media_link_target()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.linked_entry_type NOT IN ('learning_entry') THEN
    RAISE EXCEPTION 'Unsupported linked_entry_type: %', NEW.linked_entry_type;
  END IF;

  IF NEW.linked_entry_type = 'learning_entry' THEN
    IF NOT EXISTS (SELECT 1 FROM public.learning_entries WHERE id = NEW.linked_entry_id) THEN
      RAISE EXCEPTION 'Referenced learning_entry does not exist: %', NEW.linked_entry_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- =========================================================================
-- 4. TRIGGERS
-- =========================================================================

CREATE TRIGGER languages_updated_at
  BEFORE UPDATE ON public.languages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER learning_entries_updated_at
  BEFORE UPDATE ON public.learning_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER media_assets_updated_at
  BEFORE UPDATE ON public.media_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER audio_metadata_updated_at
  BEFORE UPDATE ON public.audio_metadata
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER back_office_users_updated_at
  BEFORE UPDATE ON public.back_office_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER media_link_target_validation
  BEFORE INSERT OR UPDATE ON public.media_links
  FOR EACH ROW EXECUTE FUNCTION public.validate_media_link_target();

-- =========================================================================
-- 5. ROW LEVEL SECURITY
-- =========================================================================

ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_entry_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.back_office_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_audit_log ENABLE ROW LEVEL SECURITY;

-- Public/anonymous: published content only
CREATE POLICY "public_read_published_languages" ON public.languages
  FOR SELECT USING (status = 'published');

CREATE POLICY "public_read_published_categories" ON public.categories
  FOR SELECT USING (status = 'published');

CREATE POLICY "public_read_published_entries" ON public.learning_entries
  FOR SELECT USING (status = 'published');

CREATE POLICY "public_read_aliases_for_published" ON public.learning_entry_aliases
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.learning_entries WHERE id = learning_entry_id AND status = 'published')
  );

CREATE POLICY "public_read_published_media" ON public.media_assets
  FOR SELECT USING (status = 'published');

CREATE POLICY "public_read_audio_for_published" ON public.audio_metadata
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.media_assets WHERE id = media_asset_id AND status = 'published')
  );

CREATE POLICY "public_read_links_for_published" ON public.media_links
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.media_assets WHERE id = media_asset_id AND status = 'published')
  );

-- Admin: full CRUD via is_admin() helper
CREATE POLICY "admin_full_languages" ON public.languages FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_categories" ON public.categories FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_entries" ON public.learning_entries FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_aliases" ON public.learning_entry_aliases FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_media" ON public.media_assets FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_audio" ON public.audio_metadata FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_links" ON public.media_links FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_users" ON public.back_office_users FOR ALL USING (public.is_admin());
CREATE POLICY "admin_read_audit" ON public.verification_audit_log FOR SELECT USING (public.is_admin());
CREATE POLICY "admin_insert_audit" ON public.verification_audit_log FOR INSERT WITH CHECK (public.is_admin());

-- =========================================================================
-- 6. DYNAMIC COUNT VIEWS (replace stored category_count / entry_count)
-- =========================================================================

CREATE VIEW public.public_categories_per_language AS
SELECT language_id, COUNT(*) AS published_category_count
FROM public.categories
WHERE status = 'published'
GROUP BY language_id;

CREATE VIEW public.public_entries_per_language AS
SELECT language_id, COUNT(*) AS published_entry_count
FROM public.learning_entries
WHERE status = 'published'
GROUP BY language_id;

CREATE VIEW public.admin_entries_status_breakdown AS
SELECT language_id, status, COUNT(*) AS entry_count
FROM public.learning_entries
GROUP BY language_id, status;
