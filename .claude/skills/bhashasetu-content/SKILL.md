---
name: bhashasetu-content
description: Governs Bhasha Setu learning content, editorial CMS, structured page creation, content verification, publishing, SEO/AEO, navigation content, and the boundary between verified language data and AI assistance.
---

# Bhasha Setu Content Skill

## When to use
Use this skill whenever creating, modifying, reviewing, importing, publishing, or displaying:
- Warli/Katkari learning entries
- meanings and transliterations
- learning categories
- language-content verification
- Stories & Voices content
- interviews and oral-history editorial records
- homepage/about/team/FAQ/marketing copy
- CMS pages and page sections
- new CMS-managed pages
- navigation-managed page visibility
- SEO/AEO content
- structured data
- content used by My BhashaSetu
- content publication workflows

Use:
- `bhashasetu-media` for upload, Storage, AI media generation, reuse, replacement, deletion, and media lifecycle
- `bhashasetu-supabase` for schema, migrations, RLS, Auth, Storage governance, and database access
- `bhashasetu-ui` for visual implementation
- `bhashasetu-visual-qa` for reference-based visual validation

## Source of truth
Follow this precedence:
1. Latest explicit user instruction
2. `CLAUDE.md`
3. Frozen approved architecture/product scope
4. This skill
5. Applicable specialist skills
6. Approved UI references
7. Existing verified/published project content
8. Existing implementation

Never use AI-generated assumptions to override verified language content or approved product scope.

## Critical product boundary
The Bhasha Setu website and mobile/Android application are **learning, discovery and engagement products**.

They are **not the project's language-preservation system**.

Do not describe:
- the public website
- the mobile/Android app
- Supabase
- the CMS
- the Media Library
- cloud audio uploads
- cloud language records

as the mechanism that preserves Warli or Katkari.

The Bhasha Setu robot/offline system has the separate preservation/distribution responsibility defined by the wider project.

Website/mobile content may include verified Warli/Katkari text and audio for learning and engagement. That does not change the product boundary.

## Content lanes
Maintain three clear content lanes.

### 1. Verified learning content
Examples:
- Warli/Katkari words
- phrases
- transliteration
- Hindi meaning
- English meaning
- categories
- approved aliases
- pronunciation audio association
- learning/quiz use

This content requires stronger accuracy and verification controls.

### 2. Editorial content
Examples:
- Home
- About
- Team
- FAQs
- Stories & Voices
- interview introductions
- calls to action
- marketing copy
- download/app information
- contact/social copy

This is normal CMS-managed editorial content.

### 3. Structured pages
New CMS-managed pages assembled from approved reusable section types.

Do not collapse these three lanes into one generic content table or one unrestricted rich-text system.

## Verified language content
The verified database is authoritative for Warli/Katkari learning content.

A learning entry may include approved fields such as:
- language
- entry type
- native text
- transliteration
- English meaning
- Hindi meaning
- category
- aliases
- linked pronunciation/audio
- source/provenance where applicable
- verification information
- publication state
- featured status where required

Avoid unnecessary duplication between the learning entry and linked audio/media metadata.

## Accuracy rule
Never invent, infer, autocomplete, or silently "correct" Warli/Katkari words, phrases, meanings, transliterations, aliases, or translations using an LLM.

If verified content is missing:
- state that it is not currently available
- allow an authorized Back Office workflow to add/verify it
- do not fill the gap with model knowledge

AI may assist with formatting or general editorial work, but cannot become the authority for the language dataset.

## Verification workflow
Use explicit controlled states appropriate to the frozen architecture, such as:

**Draft → Pending Verification → Verified → Published → Archived**

A record may be verified but not yet published.

Do not publish language learning content that requires verification until verification is complete.

Track verification information sufficiently to answer who/what process approved the record where the project requires it.

Do not fabricate provenance or verification details.

## Audio association
Audio used on website/mobile is learning content/media, not a claim of preservation.

A verified learning entry may link to one or more approved audio assets through the unified media architecture.

Do not duplicate:
- audio files
- English/Hindi meanings
- speaker/provenance data

across unrelated records merely for convenience.

Audio upload, consent/provenance metadata, Storage, replacement and lifecycle are governed by `bhashasetu-media`.

## Aliases and search terms
Approved aliases exist to improve deterministic search.

Aliases may include:
- alternate approved spelling
- transliteration variation
- approved synonym/search phrase

Aliases point to the canonical learning entry.

Do not allow an LLM to create and publish aliases automatically.

## My BhashaSetu content boundary
My BhashaSetu must classify intent before routing.

### Language lookup
For Warli/Katkari lookup:
1. search canonical verified content
2. search approved aliases
3. search approved English/Hindi/transliteration fields
4. use approved partial/database search
5. if no verified result exists, stop with a clear "not currently available" response

Do not ask an LLM to manufacture a missing translation or phrase.

### Platform help / guided learning
For:
- how to use Bhasha Setu
- where to find content
- guided learning
- explanations based on approved project content

use approved content first and use an LLM only where appropriate under the project's LLM-last rules.

The assistant must distinguish verified language facts from generated general guidance.

## Editorial CMS
Normal public-facing editorial text should be manageable from Back Office where intended by the architecture.

Examples:
- headings
- body copy
- captions
- CTAs
- FAQs
- team information
- contact information
- app/download copy
- story/interview introductions
- marketing copy
- social URLs/configuration where applicable

Do not hardcode ordinary editable editorial content merely to reproduce a UI reference.

Keep technical/system labels in code where they are not editorial content.

## Stories & Voices
Stories & Voices may include approved content types such as:
- story
- interview
- oral_history

Preserve `content_type`.

Support appropriate relationships to:
- language
- people/speaker
- village/region where applicable
- media
- editorial text
- publication status

Do not present editorial summaries as verified language translations unless they have separately passed the relevant verification workflow.

## Media in content
Content defines the editorial purpose of media. `bhashasetu-media` governs the media lifecycle.

For a content/page media slot, support the approved Media Library workflow:
- Select Existing
- Manual Upload
- Create with AI where appropriate

For video/audio where AI creation is not appropriate, use Select Existing / Manual Upload.

Content configuration should define:
- slot purpose
- role
- expected aspect ratio/orientation where relevant
- caption/alt/editorial context
- whether the slot is required
- how it appears in the section

Do not duplicate upload/storage/provider logic inside the content system.

## New page creation
Back Office must support creating new CMS-managed pages without requiring code for every ordinary content page.

A new page should support, as applicable:
- internal page name
- public title
- slug/path
- status
- reusable sections
- text content
- image/video/audio slots
- CTAs
- SEO fields
- AEO/structured-data configuration where appropriate
- navigation visibility/placement where allowed
- preview
- publish/archive

Do not create a free-form Webflow-style visual page builder.

## Controlled section system
New pages must be assembled from approved reusable section/component types.

Initial/approved section types may include patterns such as:
- Hero
- Rich Text
- Text + Image
- Image
- Video
- Audio/Learning
- Story/Interview Cards
- Language/Learning Cards
- CTA
- FAQ
- approved list/grid sections
- other section types explicitly added to the design system

The exact available section catalogue should be driven by implemented approved components, not by arbitrary database values.

Do not allow editors to enter custom HTML/CSS/JavaScript to invent layouts.

## Adding a genuinely new section type
If a new page requires a layout not represented by an approved reusable component:

1. define the content requirement
2. define the proposed section/component
3. obtain approval where it materially changes visual direction
4. implement it under `bhashasetu-ui`
5. visually validate it under `bhashasetu-visual-qa` where applicable
6. expose the approved component to the CMS section catalogue
7. then allow editors to reuse it

Do not let the CMS generate arbitrary new UI components.

## Page rendering
Page content should render through controlled typed section definitions.

Prefer explicit section schemas/types over an unrestricted JSON dumping ground.

Each section type should validate its expected fields.

Do not build a universal component with dozens of unrelated options when a small set of clear components is easier to maintain.

## Slugs and URLs
Slugs must be:
- validated
- unique where required
- stable after publication unless intentionally changed

If a published slug changes, consider redirect/SEO impact before applying it.

Do not silently break existing public URLs.

Reserved/system routes must not be claimable by arbitrary CMS pages.

## Navigation
Where architecture permits CMS-managed navigation:
- only eligible published pages may be exposed publicly
- maintain controlled ordering
- distinguish primary/footer/other approved navigation placements
- prevent duplicate or broken links
- do not allow arbitrary navigation structures that contradict approved IA

Creating a page does not automatically mean it belongs in primary navigation.

## Draft, preview and publish
Editorial pages should normally support:

**Draft → Preview → Publish → Archive**

Preview must not require publishing the page publicly.

Do not expose drafts through public queries/routes.

Publishing should validate required content and media references.

## Deletion
Prefer archive/unpublish over destructive deletion for published content with history or inbound references.

Before destructive deletion:
- check media links
- check navigation
- check related content
- check public URL implications
- check relevant audit/history requirements

Do not leave broken links or orphaned relationships.

## SEO
CMS-managed public pages should support practical SEO fields where appropriate:
- SEO title
- meta description
- canonical URL behavior
- index/noindex where genuinely required
- OG/social title/description where needed
- OG image through Media Library
- stable slug
- meaningful headings

Use sensible defaults so editors do not have to fill every field manually.

Do not keyword-stuff or generate large volumes of low-value pages.

## AEO
AEO should improve machine-readable clarity of genuine useful content, not create spam.

Where appropriate:
- answer important user questions directly
- structure FAQs clearly
- use meaningful headings
- maintain entity/language/page context
- expose accurate structured data
- keep factual claims grounded in approved content

Do not create fake FAQs solely for schema markup.

Do not generate unverified Warli/Katkari answers for AEO.

## Structured data
Use schema.org/JSON-LD only where it accurately describes the page.

Examples may include:
- Organization
- WebSite
- BreadcrumbList
- FAQPage where genuine FAQs are visible
- Article/VideoObject where appropriate
- other schema types justified by actual page content

Structured data should be generated from the same approved CMS content rather than maintained as contradictory duplicate prose.

Do not expose unsupported claims in JSON-LD.

## Social and sharing content
Social profile URLs should come from approved non-secret configuration.

Social icons are code/UI assets, not CMS-uploaded media by default.

OG/social images may use the Media Library.

Do not create a second social-media content database merely for links/icons.

## Marketing content
Marketing is a Back Office content area but should reuse the same editorial and media foundations.

Marketing content may include:
- campaign copy
- campaign pages
- CTA copy
- approved creatives
- social/share copy
- page promotion metadata

Do not create a second CMS or Media Library for marketing.

Campaign-specific fields belong in the marketing/content model where appropriate.

## AI-assisted editorial writing
AI may assist authorized editors with general editorial content where explicitly enabled.

Examples:
- draft a page summary
- improve grammar
- suggest FAQ wording
- create a meta description
- propose CTA variants

Rules:
- AI output enters an editable Draft
- user reviews before publishing
- factual project claims must remain grounded in approved project information
- AI must not invent Warli/Katkari language data
- AI must not invent team, fieldwork, impact, partnerships, statistics, speaker details, or preservation claims

Prefer deterministic templates/rules before an LLM where they solve the task adequately.

## Import/bulk content
Bulk import may be useful for verified learning datasets.

Before import:
- validate required fields
- validate language/category references
- detect duplicates
- preserve source/provenance
- keep unverified records out of Published state
- report row-level failures clearly

Do not let a bulk import silently overwrite verified content.

Do not use an LLM to "repair" missing language translations during import.

## Content versioning and audit
Important editorial/language changes should be traceable according to the approved audit architecture.

Prioritize auditability for:
- verified learning content edits
- verification changes
- publication/unpublication
- page slug changes
- major editorial page changes
- navigation changes
- structured-data configuration
- important marketing content changes

Do not create a complex Git-like version-control UI unless demonstrated need arises.

## Content completeness
Handle missing optional content gracefully.

Do not render:
- empty headings
- broken media slots
- "undefined"
- placeholder lorem ipsum
- empty CTA buttons
- malformed structured data

Required fields should be validated before publication.

## Content portability
Keep content structured enough that website/mobile can consume it without scraping rendered HTML.

Avoid storing entire complex pages as one giant HTML blob.

Use rich text only where rich text is genuinely the right primitive.

## Mobile relationship
The mobile/Android experience uses the same approved backend content where architecture specifies shared content.

Do not create duplicate mobile-only copies of the same learning/editorial content unless the product explicitly requires different copy or structure.

Where mobile presentation differs, keep presentation logic in UI rather than duplicating content unnecessarily.

## Performance
Do not make every page require excessive CMS/database requests.

Fetch content at sensible page/section boundaries.

Avoid loading unused large media metadata or full related datasets merely because they are available.

Do not introduce a separate headless CMS product unless explicitly approved; Supabase-backed Back Office remains the current architecture.

## Security
Only authorized Back Office users may mutate managed content.

Public users should receive published public content only.

Sanitize/validate editor-controlled rich content and URLs.

Do not allow arbitrary script execution through CMS fields.

Never store secrets in content/configuration fields.

## Cost discipline
Content management should not require an LLM call for normal CRUD, rendering, search, publishing, navigation or metadata handling.

Use:
**Code first → verified/public data → deterministic search/rules → paid APIs where justified → LLM last**

Do not automatically call AI when an editor opens/saves a page.

## Prohibited shortcuts
Do not:
- describe website/mobile/Supabase as the preservation system
- invent Warli/Katkari content
- publish unverified language content
- fabricate provenance/verification
- hardcode ordinary editable editorial content into UI
- build a free-form page builder
- allow custom editor JavaScript/CSS
- duplicate media lifecycle logic
- duplicate the same content for desktop/mobile without need
- create a second CMS for marketing
- create SEO/AEO spam pages
- use fake FAQ content for structured data
- let AI publish directly
- expose draft content publicly
- silently change published slugs
- overwrite verified content during import
- use an LLM for normal CRUD/search/routing
- turn structured page content into an untyped JSON dumping ground

## Implementation workflow
For content work:
1. Read `CLAUDE.md`.
2. Load this skill and applicable specialist skills.
3. Identify content lane: verified learning / editorial / structured page.
4. Identify whether media is required.
5. Define/validate structured fields.
6. For learning content, verify accuracy/provenance requirements.
7. For pages, select approved reusable sections.
8. For media slots, delegate lifecycle to `bhashasetu-media`.
9. Validate Draft/verification/publish state.
10. Validate slug/navigation impact.
11. Validate SEO/AEO/structured data where applicable.
12. Preview.
13. Publish only after required checks.
14. Verify website/mobile consume the same authoritative content correctly.
15. Audit important changes.
16. Run UI/visual QA where presentation is affected.

## Completion checklist
Content work is complete only when:
- correct content lane is used
- website/mobile are not described as preservation systems
- Warli/Katkari learning content is verified as required
- no language content was invented by AI
- audio/media associations use the approved media architecture
- editorial content is CMS-managed where intended
- new pages use approved reusable sections
- no unrestricted page-builder behavior was introduced
- media slots use Media Library workflow
- drafts remain private
- preview works where applicable
- publish validation works
- slug/navigation rules are safe
- SEO fields/defaults are sensible
- AEO/structured data is accurate and non-spammy
- mobile does not unnecessarily duplicate content
- important changes are auditable
- no secrets/custom scripts are stored in CMS
- relevant tests/build checks pass

## Back Office visibility
This skill is development governance.

The future read-only Back Office Skills Registry may display:
- skill name
- purpose
- status
- version
- last updated
- applicable area
- approved tool summary

The actual Back Office content areas may separately expose editable content, page sections, SEO/AEO settings, media slots, verification states, and publishing controls according to user permissions.

Repository skill files remain the source of truth and must not be editable from normal Back Office UI.
