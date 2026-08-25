/**
 * Presentation config for the Back Office page editor.
 *
 * These lists were constants inside the homepage editor component. They are
 * lifted out so one editor can serve several pages, and so adding a field to
 * a seed does not mean editing a component.
 */

export type Surface = "Desktop" | "Mobile" | "Both";

/**
 * Which surface each section appears on, so an editor can tell at a glance
 * whether a change affects the desktop site, the mobile app, or both.
 *
 * Keyed by page slug first, not by section key alone: the homepage already
 * owns a section called `stories_voices` (its mobile stories row) and the
 * Stories & Voices page owns generically named ones like `hero`. A flat map
 * would mislabel both.
 */
export const SURFACE_BY_PAGE: Record<string, Record<string, Surface>> = {
  homepage: {
    // The mobile home screen reads the desktop hero's image slot, so an
    // upload here lands on both surfaces.
    hero: "Both",
    wro_project: "Both",
    learn_explore: "Both",
    voices_inspire: "Desktop",
    my_bhasha_setu: "Both",
    mobile_hero: "Mobile",
    todays_word: "Mobile",
    // Heading and link label only — the cards themselves come from the
    // Stories module, not from this screen.
    stories_voices: "Mobile",
  },
  "stories-voices": {
    hero: "Both",
    community_interviews: "Both",
    voices_audio: "Both",
    featured_story: "Both",
    student_team: "Both",
    footer_strip: "Both",
  },
};

export function surfaceFor(pageSlug: string, sectionKey: string): Surface {
  return SURFACE_BY_PAGE[pageSlug]?.[sectionKey] ?? "Both";
}

/**
 * Human labels for field and slot keys. Flat and additive: `heading` and
 * `description` mean the same thing on any page. Unknown keys fall back to a
 * de-slugged form, so a new seed field is readable before it is listed here.
 */
const FIELD_LABELS: Record<string, string> = {
  // Homepage
  hero_image: "Hero image",
  wro_video: "WRO video",
  robot_image: "Robot image",
  card_warli_image: "Warli card image",
  card_katkari_image: "Katkari card image",
  card_play_image: "Play & Learn card image",
  card_stories_image: "Stories card image",
  testimonial_1_image: "Testimonial 1 portrait",
  testimonial_2_image: "Testimonial 2 portrait",
  testimonial_3_image: "Testimonial 3 portrait",
  todays_word_audio: "Pronunciation audio",
  todays_word_image: "Artwork",
  native_text: "Native text (Warli / Katkari)",
  english_meaning: "English meaning",
  hindi_meaning: "Hindi meaning",
  greeting: "Greeting",

  // Shared
  heading: "Heading",
  description: "Description",
  title: "Title",
  subtitle: "Subtitle",
  label: "Label",
  cta_text: "Call-to-action label",
  quote: "Quote",

  // Stories & Voices
  tagline: "Tagline",
  quote_text: "Pull quote",
  quote_attribution: "Pull quote attribution",
  stat_1_value: "Stat 1 figure",
  stat_2_value: "Stat 2 figure",
  stat_3_value: "Stat 3 figure",
  stat_4_value: "Stat 4 figure",
  stat_1_label: "Stat 1 label",
  stat_2_label: "Stat 2 label",
  stat_3_label: "Stat 3 label",
  stat_4_label: "Stat 4 label",
  mobile_heading: "Heading (mobile)",
  mobile_subtitle: "Subtitle (mobile)",
  photo_1_caption: "Photo 1 caption",
  photo_2_caption: "Photo 2 caption",
  photo_3_caption: "Photo 3 caption",
  photo_4_caption: "Photo 4 caption",
  ethics_heading: "Consent card heading",
  ethics_description: "Consent card text",
  ethics_cta_text: "Consent card link label",
  student_photo_1: "Field photo 1",
  student_photo_2: "Field photo 2",
  student_photo_3: "Field photo 3",
  student_photo_4: "Field photo 4",
};

export function labelFor(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  return key
    .replace(/_/g, " ")
    .replace(/\b(\w)/g, (m) => m.toUpperCase())
    .replace(/\bCta\b/, "CTA");
}

/** Reading order for a section's fields; anything unlisted follows, sorted. */
const FIELD_ORDER = [
  "greeting",
  "label",
  "title",
  "heading",
  "mobile_heading",
  "tagline",
  "subtitle",
  "mobile_subtitle",
  "description",
  "quote",
  "quote_text",
  "quote_attribution",
  "native_text",
  "english_meaning",
  "hindi_meaning",
  "cta_text",
];

export function fieldRank(key: string): number {
  const i = FIELD_ORDER.indexOf(key);
  return i === -1 ? FIELD_ORDER.length : i;
}

export function isLongField(key: string): boolean {
  return (
    key === "description" ||
    key.endsWith("_description") ||
    key === "quote" ||
    key === "quote_text"
  );
}

/** Fields whose value renders accent gold when wrapped in *asterisks*. */
export function supportsAccent(key: string): boolean {
  return key === "heading";
}
