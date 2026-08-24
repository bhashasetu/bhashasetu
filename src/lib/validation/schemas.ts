import { z } from "zod";

export const languageStatusValues = ["draft", "published", "archived"] as const;
export const categoryStatusValues = ["draft", "published", "archived"] as const;
export const entryStatusValues = [
  "draft",
  "pending_verification",
  "verified",
  "published",
  "archived",
] as const;
export const mediaStatusValues = ["draft", "published", "archived"] as const;
/** Mirrors learning_entries_entry_type_valid (migration 0021). */
export const entryTypeValues = ["word", "phrase"] as const;
export const storyStatusValues = ["draft", "published", "archived"] as const;
export const storyFormatValues = ["interview", "audio", "song"] as const;

export const languageInputSchema = z.object({
  code: z.string().trim().min(1).max(10),
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().max(5000).optional().nullable(),
  featured: z.boolean().optional(),
});

export const categoryInputSchema = z.object({
  language_id: z.string().uuid(),
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().max(5000).optional().nullable(),
  icon_name: z.string().trim().max(100).optional().nullable(),
  display_order: z.number().int().optional(),
});

export const learningEntryInputSchema = z.object({
  language_id: z.string().uuid(),
  category_id: z.string().uuid(),
  native_text: z.string().trim().min(1).max(500),
  transliteration: z.string().trim().max(500).optional().nullable(),
  english_meaning: z.string().trim().min(1).max(500),
  hindi_meaning: z.string().trim().max(500).optional().nullable(),
  entry_type: z.enum(entryTypeValues).optional(),
  region: z.string().trim().max(255).optional().nullable(),
  speaker_notes: z.string().trim().max(5000).optional().nullable(),
  display_order: z.number().int().optional(),
});

/**
 * A Stories & Voices record. Mirrors the stories table's CHECK constraints,
 * so a value the form accepts is a value the database accepts.
 *
 * consent_confirmed is not settable here: it is a deliberate act with its own
 * endpoint, not something a bulk field update can flip on by accident.
 */
export const storyInputSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase words separated by hyphens"),
  title: z.string().trim().min(1).max(500),
  format: z.enum(storyFormatValues),
  speaker_name: z.string().trim().max(255).optional().nullable(),
  speaker_role: z.string().trim().max(255).optional().nullable(),
  speaker_place: z.string().trim().max(255).optional().nullable(),
  summary: z.string().trim().max(5000).optional().nullable(),
  transcript: z.string().trim().max(100000).optional().nullable(),
  language_id: z.string().uuid().optional().nullable(),
  theme: z.string().trim().max(100).optional().nullable(),
  age_group: z.string().trim().max(50).optional().nullable(),
  thumbnail_asset_id: z.string().uuid().optional().nullable(),
  media_asset_id: z.string().uuid().optional().nullable(),
  duration_seconds: z.number().int().min(0).max(86400).optional().nullable(),
  recorded_on: z.string().trim().max(20).optional().nullable(),
  recorded_by: z.string().trim().max(255).optional().nullable(),
  featured: z.boolean().optional(),
  display_order: z.number().int().optional(),
  meta_title: z.string().trim().max(255).optional().nullable(),
  meta_description: z.string().trim().max(500).optional().nullable(),
});

export const storyStatusTransitionSchema = z.object({
  status: z.enum(storyStatusValues),
  /** Recorded consent from the speaker; publishing is refused without it. */
  consent_confirmed: z.boolean().optional(),
});

export const pageTypeValues = [
  "homepage",
  "about",
  "stories_voices",
  "language_selection",
  "heritage",
  "custom",
] as const;

export const structuredDataValues = [
  "WebPage",
  "CollectionPage",
  "AboutPage",
  "FAQPage",
] as const;

/**
 * Editable page settings, including the SEO/AEO fields (CLAUDE.md section 15).
 *
 * The PUT handler previously spread the request body straight into the
 * update, so an admin request could write any column on the row — id
 * included. Naming the fields keeps that surface to what the screens
 * actually edit. `slug` is absent on purpose: it is the key the public
 * routes and the sitemap look pages up by.
 */
export const pageSettingsInputSchema = z
  .object({
    title: z.string().trim().min(1).max(255),
    description: z.string().trim().max(5000).nullable(),
    page_type: z.enum(pageTypeValues),
    status: z.enum(["draft", "published", "archived"]),
    meta_title: z.string().trim().max(255).nullable(),
    meta_description: z.string().trim().max(500).nullable(),
    meta_keywords: z.string().trim().max(500).nullable(),
    canonical_url: z.string().trim().url().max(500).nullable(),
    og_title: z.string().trim().max(255).nullable(),
    og_description: z.string().trim().max(500).nullable(),
    og_image_slot_id: z.string().uuid().nullable(),
    noindex: z.boolean(),
    page_summary: z.string().trim().max(5000).nullable(),
    structured_data_type: z.enum(structuredDataValues).nullable(),
    last_reviewed_at: z.string().trim().max(40).nullable(),
  })
  .partial();

export const aliasInputSchema = z.object({
  learning_entry_id: z.string().uuid(),
  alias: z.string().trim().min(1).max(500),
});

export const mediaLinkInputSchema = z.object({
  media_asset_id: z.string().uuid(),
  linked_entry_type: z.literal("learning_entry"),
  linked_entry_id: z.string().uuid(),
  link_type: z.string().trim().min(1).max(100),
  link_order: z.number().int().optional(),
});

export const mediaMetadataInputSchema = z.object({
  title: z.string().trim().max(500).optional().nullable(),
  description: z.string().trim().max(5000).optional().nullable(),
  alt_text: z.string().trim().max(1000).optional().nullable(),
  caption: z.string().trim().max(2000).optional().nullable(),
  credit: z.string().trim().max(500).optional().nullable(),
});

export const audioMetadataInputSchema = z.object({
  speaker_name: z.string().trim().max(255).optional().nullable(),
  speaker_code: z.string().trim().max(50).optional().nullable(),
  region: z.string().trim().max(255).optional().nullable(),
  recording_date: z.string().trim().optional().nullable(),
  recording_source: z.string().trim().max(255).optional().nullable(),
  consent_status: z.enum(["obtained", "pending", "not_applicable"]).optional().nullable(),
  playback_permission: z.enum(["public", "restricted"]).optional(),
  quality_rating: z.enum(["high", "medium", "low"]).optional().nullable(),
});

export const statusTransitionSchema = z.object({
  status: z.enum(entryStatusValues),
  notes: z.string().trim().max(2000).optional(),
});
