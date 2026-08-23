-- Bhasha Setu — Phase 2: CMS-managed pages, sections, media slots, and generation prompts

-- =========================================================================
-- 1. PAGES TABLE
-- =========================================================================

CREATE TABLE public.pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  meta_title VARCHAR(255),
  meta_description VARCHAR(500),
  meta_keywords VARCHAR(500),
  status VARCHAR(50) DEFAULT 'draft',
  page_type VARCHAR(50) NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT pages_status_valid CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT pages_type_valid CHECK (page_type IN ('homepage', 'about', 'stories_voices', 'language_selection', 'heritage', 'custom'))
);

-- =========================================================================
-- 2. PAGE SECTIONS TABLE
-- =========================================================================

CREATE TABLE public.page_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  section_key VARCHAR(100) NOT NULL,
  title VARCHAR(500),
  description TEXT,
  display_order INT DEFAULT 0,
  section_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(page_id, section_key),
  CONSTRAINT page_sections_type_valid CHECK (section_type IN ('hero', 'content', 'media_grid', 'carousel', 'featured', 'testimonials', 'stats', 'custom')),
  CONSTRAINT page_sections_status_valid CHECK (status IN ('draft', 'published', 'archived'))
);

-- =========================================================================
-- 3. MEDIA SLOTS TABLE
-- =========================================================================

CREATE TABLE public.media_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.page_sections(id) ON DELETE CASCADE,
  slot_key VARCHAR(100) NOT NULL,
  slot_position INT DEFAULT 0,
  media_type VARCHAR(50) NOT NULL,
  aspect_ratio VARCHAR(20),
  min_width INT,
  min_height INT,
  alt_text_template TEXT,
  required BOOLEAN DEFAULT FALSE,
  status VARCHAR(50) DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(section_id, slot_key),
  CONSTRAINT media_slots_type_valid CHECK (media_type IN ('image', 'audio', 'video', 'hero_image', 'thumbnail')),
  CONSTRAINT media_slots_status_valid CHECK (status IN ('draft', 'published', 'archived'))
);

-- =========================================================================
-- 4. GENERATION PROMPTS TABLE
-- =========================================================================

CREATE TABLE public.generation_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL REFERENCES public.media_slots(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  prompt_text TEXT NOT NULL,
  model_name VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  version INT DEFAULT 1,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT generation_prompts_provider_valid CHECK (provider IN ('openai', 'fal.ai', 'flux', 'manual'))
);

-- =========================================================================
-- 5. SLOT MEDIA ASSIGNMENTS TABLE
-- =========================================================================

CREATE TABLE public.slot_media_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL REFERENCES public.media_slots(id) ON DELETE CASCADE,
  media_asset_id UUID NOT NULL REFERENCES public.media_assets(id) ON DELETE CASCADE,
  assignment_order INT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'draft',
  published_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(slot_id, media_asset_id),
  CONSTRAINT slot_media_status_valid CHECK (status IN ('draft', 'published', 'archived'))
);

-- =========================================================================
-- 6. GENERATED MEDIA VARIANTS TABLE (for tracking AI-generated variations)
-- =========================================================================

CREATE TABLE public.generated_media_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL REFERENCES public.media_slots(id) ON DELETE CASCADE,
  prompt_id UUID REFERENCES public.generation_prompts(id) ON DELETE SET NULL,
  media_asset_id UUID REFERENCES public.media_assets(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  model_name VARCHAR(255),
  generation_status VARCHAR(50) DEFAULT 'pending',
  approval_status VARCHAR(50) DEFAULT 'draft',
  seed VARCHAR(500),
  generation_params TEXT,
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT generated_variants_gen_status CHECK (generation_status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  CONSTRAINT generated_variants_approval_status CHECK (approval_status IN ('draft', 'approved', 'rejected', 'published', 'archived'))
);

-- =========================================================================
-- 7. PAGE CONTENT TABLE (for editorial text/CMS fields)
-- =========================================================================

CREATE TABLE public.page_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.page_sections(id) ON DELETE CASCADE,
  field_key VARCHAR(100) NOT NULL,
  field_type VARCHAR(50) NOT NULL,
  content TEXT,
  status VARCHAR(50) DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(section_id, field_key),
  CONSTRAINT page_content_type_valid CHECK (field_type IN ('text', 'html', 'markdown', 'link', 'cta')),
  CONSTRAINT page_content_status_valid CHECK (status IN ('draft', 'published', 'archived'))
);

-- =========================================================================
-- 8. INDEXES
-- =========================================================================

CREATE INDEX idx_pages_status ON public.pages(status);
CREATE INDEX idx_pages_slug ON public.pages(slug);
CREATE INDEX idx_page_sections_page_id ON public.page_sections(page_id);
CREATE INDEX idx_page_sections_status ON public.page_sections(status);
CREATE INDEX idx_media_slots_section_id ON public.media_slots(section_id);
CREATE INDEX idx_media_slots_status ON public.media_slots(status);
CREATE INDEX idx_generation_prompts_slot_id ON public.generation_prompts(slot_id);
CREATE INDEX idx_slot_media_assignments_slot_id ON public.slot_media_assignments(slot_id);
CREATE INDEX idx_slot_media_assignments_media_id ON public.slot_media_assignments(media_asset_id);
CREATE INDEX idx_generated_variants_slot_id ON public.generated_media_variants(slot_id);
CREATE INDEX idx_generated_variants_approval_status ON public.generated_media_variants(approval_status);
CREATE INDEX idx_page_content_section_id ON public.page_content(section_id);

-- =========================================================================
-- 9. ROW LEVEL SECURITY (RLS)
-- =========================================================================

-- Pages: Published visible to public, all visible to admin
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY pages_public_select ON public.pages
  FOR SELECT
  USING (status = 'published' OR auth.uid() IN (SELECT id FROM public.back_office_users WHERE is_active = TRUE));

CREATE POLICY pages_admin_all ON public.pages
  FOR ALL
  USING (is_admin());

-- Page Sections: Inherit from pages
ALTER TABLE public.page_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY page_sections_public_select ON public.page_sections
  FOR SELECT
  USING (
    page_id IN (SELECT id FROM public.pages WHERE status = 'published')
    OR auth.uid() IN (SELECT id FROM public.back_office_users WHERE is_active = TRUE)
  );

CREATE POLICY page_sections_admin_all ON public.page_sections
  FOR ALL
  USING (is_admin());

-- Media Slots: Inherit from sections
ALTER TABLE public.media_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY media_slots_public_select ON public.media_slots
  FOR SELECT
  USING (
    section_id IN (
      SELECT id FROM public.page_sections
      WHERE page_id IN (SELECT id FROM public.pages WHERE status = 'published')
    )
    OR auth.uid() IN (SELECT id FROM public.back_office_users WHERE is_active = TRUE)
  );

CREATE POLICY media_slots_admin_all ON public.media_slots
  FOR ALL
  USING (is_admin());

-- Generation Prompts: Admin only
ALTER TABLE public.generation_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY generation_prompts_admin_all ON public.generation_prompts
  FOR ALL
  USING (is_admin());

-- Slot Media Assignments: Published visible to public, all to admin
ALTER TABLE public.slot_media_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY slot_media_assignments_public_select ON public.slot_media_assignments
  FOR SELECT
  USING (
    (
      slot_id IN (
        SELECT id FROM public.media_slots
        WHERE section_id IN (
          SELECT id FROM public.page_sections
          WHERE page_id IN (SELECT id FROM public.pages WHERE status = 'published')
        )
      )
      AND status = 'published'
    )
    OR auth.uid() IN (SELECT id FROM public.back_office_users WHERE is_active = TRUE)
  );

CREATE POLICY slot_media_assignments_admin_all ON public.slot_media_assignments
  FOR ALL
  USING (is_admin());

-- Generated Media Variants: Admin only
ALTER TABLE public.generated_media_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY generated_variants_admin_all ON public.generated_media_variants
  FOR ALL
  USING (is_admin());

-- Page Content: Published visible to public, all to admin
ALTER TABLE public.page_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY page_content_public_select ON public.page_content
  FOR SELECT
  USING (
    (
      section_id IN (
        SELECT id FROM public.page_sections
        WHERE page_id IN (SELECT id FROM public.pages WHERE status = 'published')
      )
      AND status = 'published'
    )
    OR auth.uid() IN (SELECT id FROM public.back_office_users WHERE is_active = TRUE)
  );

CREATE POLICY page_content_admin_all ON public.page_content
  FOR ALL
  USING (is_admin());

-- =========================================================================
-- 10. TRIGGERS FOR AUTOMATIC UPDATED_AT
-- =========================================================================

CREATE TRIGGER update_pages_updated_at
  BEFORE UPDATE ON public.pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_page_sections_updated_at
  BEFORE UPDATE ON public.page_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_media_slots_updated_at
  BEFORE UPDATE ON public.media_slots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_slot_media_assignments_updated_at
  BEFORE UPDATE ON public.slot_media_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_page_content_updated_at
  BEFORE UPDATE ON public.page_content
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
