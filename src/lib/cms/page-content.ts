/**
 * Shape of a CMS page as the public pages read it, plus the accessors they
 * all need.
 *
 * Every public page was re-declaring these three helpers with `any`
 * parameters, which is both duplication and the reason the codebase carried
 * a standing set of no-explicit-any errors. Typing the shape once here lets
 * each page drop its local copies.
 *
 * These are hand-written rather than generated because the queries select
 * subsets of columns; they describe what the pages actually consume, not the
 * full table definitions.
 */

export type PageContentField = {
  id: string;
  field_key: string;
  content: string | null;
};

export type PageMediaSlot = {
  id: string;
  slot_key: string;
  media_type: string;
  aspect_ratio: string | null;
  /** 'archived' marks a slot the page has stopped rendering. */
  status?: string;
};

export type PageSection = {
  id: string;
  section_key: string;
  page_content?: PageContentField[] | null;
  media_slots?: PageMediaSlot[] | null;
};

/** Find a section by its stable key, e.g. "hero". */
export function findSection(
  sections: PageSection[] | null | undefined,
  sectionKey: string
): PageSection | undefined {
  return sections?.find((s) => s.section_key === sectionKey);
}

/** Read one editorial field from a section, e.g. "heading". */
export function findContent(
  section: PageSection | undefined,
  fieldKey: string
): string | undefined {
  return (
    section?.page_content?.find((c) => c.field_key === fieldKey)?.content ??
    undefined
  );
}

/** Find a media slot within a section by its stable key. */
export function findSlot(
  section: PageSection | undefined,
  slotKey: string
): PageMediaSlot | undefined {
  return section?.media_slots?.find((s) => s.slot_key === slotKey);
}
