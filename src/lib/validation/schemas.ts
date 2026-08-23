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
  entry_type: z.string().trim().max(50).optional(),
  region: z.string().trim().max(255).optional().nullable(),
  speaker_notes: z.string().trim().max(5000).optional().nullable(),
  display_order: z.number().int().optional(),
});

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
