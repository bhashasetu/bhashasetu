---
name: bhashasetu-media
description: Governs Bhasha Setu production media: image, audio and video upload, metadata, reuse, AI image generation, approval, publishing, replacement, deletion, cost control, and Back Office media workflows.
---

# Bhasha Setu Media Skill

## When to use
Use this skill whenever creating, modifying, reviewing, or debugging:
- Media Library
- image/audio/video upload
- media metadata
- media selection from Back Office
- Warli/Katkari audio management
- interview/story media
- homepage/page media slots
- AI image generation
- AI prompt presets
- media approval/publishing
- media replacement/deletion
- where-used tracking
- thumbnails/crops/focal points
- provider/model configuration
- media-related Storage operations

Use `bhashasetu-supabase` for database/RLS/Storage governance and `bhashasetu-ui` for how media appears in approved UI.

## Source of truth
1. Latest explicit user instruction
2. `CLAUDE.md`
3. Frozen architecture
4. This skill
5. `bhashasetu-supabase`
6. `bhashasetu-ui`
7. Approved UI references
8. Existing implementation

Do not silently change the media architecture because a provider SDK or UI library suggests a different model.

## Core media architecture
All normal production media is managed through the Back Office.

Normal flow:

**Back Office → validation → Supabase Storage → media metadata → media link → website/mobile**

Production media includes:
- images
- illustrations
- Warli/Katkari audio
- interview audio/video
- story media
- thumbnails
- homepage/page imagery
- marketing creatives
- approved AI-generated imagery

Development UI references under `docs/ui-references/` are NOT production media.

Do not manually put ordinary editorial production media into Git as the normal workflow.

Core technical brand assets such as the canonical logo may remain repository assets when intentionally designated as such.

## Unified asset model
Use the frozen unified media architecture:
- `media_assets` — one managed record per image/audio/video asset
- `audio_metadata` — audio-specific metadata linked 1:1 where applicable
- `media_links` — reusable association between assets and content/entities

Do not create separate competing media libraries for images, audio and video.

`media_links.role` describes purpose, not file type.

Examples:
- hero
- thumbnail
- pronunciation
- interview_video
- story_audio
- illustration
- og_image
- quiz_media
- marketing_creative

One asset may be reused in multiple approved locations.

## Back Office Media Library
The Media Library must support, as applicable:
- browse/search/filter
- preview/playback
- upload
- select existing asset
- edit metadata
- replace asset
- archive
- delete when safe
- where-used view
- status
- language association where relevant
- source/provenance
- verification/approval information
- AI-generation information where applicable

Do not turn the Media Library into a full digital-asset-management enterprise product.

Keep V1 understandable for students and administrators.

## Page/section media slots
When a CMS-managed page contains an image/media area, the Back Office should expose that slot in the corresponding page/section editor.

For an image slot, normally support:
1. Select Existing Media
2. Manual Upload
3. Create with AI, where appropriate

The editor should communicate:
- slot purpose
- recommended/required aspect ratio
- orientation
- safe-area/crop expectation where relevant
- current asset
- replacement behavior
- publication status

Do not force AI generation when manual upload is sufficient.

## Manual upload
Manual upload is the default reliable path.

Before upload:
- validate allowed media type
- validate file size against project limits
- validate basic format/mime type
- capture required metadata
- identify destination/use where known

After upload:
- create/update `media_assets`
- attach audio metadata if applicable
- link asset through `media_links` where assigned
- preserve original provenance
- show preview
- require the appropriate approval/publication state

Do not trust filename extensions alone for validation.

## Image metadata
Store useful metadata without creating unnecessary fields.

Typical image metadata may include:
- title
- alt text
- caption
- description
- source/provenance
- creator/credit where relevant
- language association where relevant
- width
- height
- mime type
- file size
- aspect ratio
- focal point where needed
- generation source/model if AI-generated
- generation prompt/version if AI-generated
- status
- timestamps

Do not require every optional field for every image.

Alt text should describe the meaningful image content, not stuff SEO keywords.

## Audio metadata
Warli/Katkari audio is culturally important project data and requires stronger provenance.

Audio records should support fields appropriate to the project such as:
- linked media asset
- language
- speaker/person name or approved identifier
- village/region where collected, when appropriate
- recording date where known
- source/provenance
- consent status/reference
- verification status
- transcript/native text where applicable
- transliteration where applicable
- English/Hindi meaning linkage through the learning entry rather than duplicated unnecessarily
- duration
- mime/format
- file size
- recording quality/notes where useful
- status
- timestamps

Do not fabricate missing speaker, location, consent, transcript or verification data.

Do not publish audio requiring verification/consent until the required project checks are satisfied.

## Audio reuse
A pronunciation recording may be reused by:
- learning entry
- Listen & Repeat
- quiz
- story
- My BhashaSetu verified answer

Reuse the asset through `media_links`; do not duplicate the file merely because it appears in multiple features.

## Video
Use Supabase Storage for project-managed video when appropriate and practical.

For interview/story video metadata, support:
- title
- language
- people/speaker context
- village/region where appropriate
- source/provenance
- consent status/reference where applicable
- thumbnail
- duration
- caption/description
- status

Do not automatically transcode or create a complex video pipeline in V1.

If video size/bandwidth becomes a demonstrated constraint, propose a targeted solution before adding new infrastructure.

## AI image generation
AI image generation is an optional Back Office creation path, not the default for every image.

Approved provider direction may include:
- fal.ai
- an approved FLUX-family model available through fal.ai
- OpenAI image generation where explicitly configured/appropriate

Do not hardcode a specific model version permanently into UI or business logic.

Provider/model selection must come from validated non-secret configuration.

Secrets remain in the approved server-side secret store and never in Back Office database fields.

## Provider abstraction
Keep provider integration thin.

Use a small server-side provider interface so the Back Office workflow does not depend directly on one model name.

Conceptually:
- generate image
- return provider job/result
- validate result
- ingest accepted output into Supabase Storage
- create `media_assets` record
- mark Draft
- require human approval

Do not build an elaborate multi-provider orchestration platform.

Do not add an AI agent for media generation.

## Prompt presets
Each AI-enabled media slot may have a curated default prompt/prompt template appropriate to that page/section.

Prompt presets should help reduce:
- repeated manual prompt writing
- inconsistent visual direction
- wasted generations
- accidental aspect-ratio mistakes
- unnecessary credit usage

A prompt preset may include:
- slot/page purpose
- subject
- visual direction
- composition
- aspect ratio
- required negative constraints
- Bhasha Setu brand/robot guidance where applicable

The user must be able to edit the prompt before generation.

Do not let Claude generate a fresh long prompt on every request when a stable approved preset can be reused.

## Prompt storage
Store prompt presets/versioned prompt configuration as non-secret project configuration or approved media-generation configuration.

For generated assets, preserve enough generation metadata to reproduce/audit the result where practical:
- provider
- model identifier
- prompt
- prompt preset/version
- dimensions/aspect ratio
- generation timestamp
- provider request/result identifier where useful
- estimated/known cost where available

Do not store API keys with prompt configuration.

## Cost controls
AI image generation consumes credits and must be deliberate.

Back Office should support practical safeguards such as:
- explicit Generate action
- no generation on page load
- no automatic retry loop that can spend repeatedly
- default to one generation unless user requests variants
- show provider/model before generation where useful
- show estimated cost when the provider exposes enough information to calculate it reliably
- record actual/known generation cost when available
- prevent accidental double submission
- rate-limit or lock repeated generation while a job is active
- reuse approved assets instead of regenerating identical needs

Do not invent cost estimates when provider pricing cannot be confirmed.

Do not automatically generate images for every empty CMS slot.

## LoRA / custom model rule
Do not introduce LoRA training merely to save a small number of image-generation credits.

A LoRA/custom model adds:
- training data requirements
- training cost
- versioning
- storage
- evaluation
- maintenance
- consistency risk

Use curated prompt presets and canonical reference assets first.

Only propose LoRA/custom fine-tuning if repeated generation volume and consistency requirements demonstrate a clear benefit that outweighs operational complexity.

Do not train on copyrighted or unapproved assets.

## Canonical logo and robot
The official Bhasha Setu logo must not be redrawn by an image model when the real asset is available.

The canonical robot reference/asset should be used where product identity matters.

If AI generation must depict the robot:
- use the approved reference-input capability supported by the chosen provider where available
- preserve recognizable robot identity
- do not silently replace it with a generic robot
- require human review before publication

Do not claim exact character consistency from text prompting alone.

## AI generation approval
Mandatory workflow:

**Generate → Draft → human review → Approve/Reject → Publish/use**

AI-generated imagery must never become published merely because generation succeeded.

Rejected generations should not be selected by public pages.

Approval metadata should be traceable.

## Generated asset ingestion
Do not hotlink a provider's temporary generation URL as the permanent production asset.

After an approved generation result is received:
1. validate the returned file
2. ingest/copy it into Supabase Storage
3. create the managed `media_assets` record
4. preserve generation metadata
5. mark it Draft
6. allow review/approval
7. link it to content only through the normal media workflow

Provider temporary URLs are not the durable source of truth.

## Image dimensions and derivatives
Preserve the original managed asset.

Do not create many pre-generated size variants without demonstrated need.

Prefer browser/CDN/platform image optimization where appropriate.

Create explicit derivatives only when there is a clear requirement such as:
- thumbnail
- social/OG image
- materially different crop

Track derivatives so they do not become orphaned mystery files.

## Crop and focal point
Where the same image is reused across different aspect ratios, prefer:
- stored focal point
- intentional CSS/object positioning
- approved derivative crop when necessary

Do not permanently crop away the original.

## Replacement
Replacing an asset must not silently break every place where it is reused.

Before replacement:
- show where-used
- clarify whether replacing the underlying asset affects all usages
- offer a new asset/link when only one placement should change

Preserve traceability where appropriate.

## Delete and archive
Default to archive/soft removal when an asset has history or active references.

Before destructive deletion:
- check `media_links`
- show where-used
- block deletion if it would create broken published content unless references are intentionally resolved
- remove Storage object only when safe and approved

Do not leave orphaned database records or Storage objects deliberately.

## Where-used
Every reusable managed asset should support a practical where-used view.

Show enough information to identify:
- entity type
- entity
- role
- publication/status where useful

This is important for safe replacement/deletion.

Do not build a graph visualization; a clear list/table is sufficient.

## Marketing media
Back Office marketing content may reuse the same Media Library.

Do not create a second media system for marketing.

Marketing creatives should support the same:
- upload
- metadata
- AI generation where appropriate
- approval
- reuse
- archive
- where-used

Campaign-specific metadata belongs in the marketing/content model, not duplicated into core media fields unless genuinely asset-specific.

## SEO/AEO media
Where relevant, allow managed selection of:
- OG/social image
- page illustration
- thumbnail

Keep descriptive metadata accurate.

Do not generate separate media solely to stuff SEO/AEO keywords.

## Security
Media upload/generation mutations require authorized Back Office access.

Provider API calls must execute server-side.

Never expose:
- fal.ai secret/API key
- OpenAI API key
- Supabase service-role key

Validate uploaded/generated files before publishing.

Do not accept arbitrary remote URLs and blindly ingest them without validation.

## Secrets
This skill defines required secret handling but does not contain secret values.

Use:
- Vercel environment variables when the Next.js server executes the provider call
- Supabase Edge secrets only when an approved Edge Function executes the provider call

Choose one execution location per workflow where practical.

Do not duplicate secrets across Vercel and Supabase merely for convenience.

Back Office may show only provider status such as:
- fal.ai: Configured / Not configured
- OpenAI: Configured / Not configured

Never display the secret itself.

## Error handling
Media operations must fail safely.

For upload/generation errors:
- show a clear actionable error
- do not create a published record
- avoid duplicate DB records on retry
- clean up incomplete Storage objects where safe
- preserve provider job/error identifiers where useful for debugging
- never expose secret-bearing raw provider errors to the browser

## Idempotency and duplicate protection
Prevent accidental duplicate uploads/generations where practical.

For AI generation:
- disable repeated submit while active
- use request/job identifiers where available
- avoid automatic retries that spend credits

For uploads:
- duplicate detection may use checksum/file metadata if justified
- do not block legitimate different assets merely because filenames match

## Observability
Log enough to debug:
- operation type
- asset id
- authorized actor
- provider/model for AI generation
- provider job id where applicable
- success/failure
- timestamps
- known cost where available

Do not log:
- API keys
- sensitive auth tokens
- unnecessary personal data

## Testing
Test at minimum:
- valid image upload
- valid audio upload
- valid video upload where supported
- invalid file rejection
- metadata edit
- media selection
- media reuse
- where-used
- replacement
- blocked unsafe delete
- archive
- AI generation success
- AI generation failure
- AI Draft state
- approval/rejection
- published asset access
- unauthorized mutation rejection
- provider-not-configured state
- double-submit protection

Use test fixtures; do not spend paid AI credits repeatedly for tests that can be mocked.

## Prohibited shortcuts
Do not:
- hardcode production media URLs in page components
- store normal production media in Git
- treat UI references as production media
- expose provider keys client-side
- store provider secrets in Supabase tables
- hotlink temporary AI provider URLs as durable production assets
- auto-publish generated media
- auto-generate every empty slot
- retry paid generations indefinitely
- duplicate files for every usage
- delete actively used media without resolving references
- fabricate audio provenance/consent/verification
- introduce LoRA without demonstrated justification
- build an unnecessary DAM, transcoding system, AI agent, or multi-provider router
- claim exact robot consistency from text prompting alone

## Implementation workflow
For media work:
1. Read `CLAUDE.md`.
2. Load `bhashasetu-supabase`, `bhashasetu-ui`, and this skill as applicable.
3. Identify the media use case and slot.
4. Determine upload vs existing asset vs AI generation.
5. Validate media requirements/aspect ratio.
6. Apply authorized server-side operation.
7. Store durable file in Supabase Storage.
8. Create/update managed metadata.
9. Create `audio_metadata` where applicable.
10. Link through `media_links`.
11. Keep generated media Draft until human approval.
12. Verify where-used behavior.
13. Verify replacement/deletion safety.
14. Test public delivery where published.
15. Test unauthorized access/mutation.
16. Verify no secrets/client leakage.
17. Run visual QA when the media materially affects an approved UI reference.

## Completion checklist
Media work is complete only when:
- asset is managed through the approved Media Library architecture
- durable file is in the intended Supabase Storage location
- metadata is sufficient and accurate
- audio provenance/verification fields are handled where applicable
- reusable relationships use `media_links`
- where-used works
- replacement/deletion is safe
- AI generation is optional, explicit and cost-controlled
- generated media enters Draft
- human approval is required before publish/use
- provider temporary URL is not the production source
- provider/model/prompt metadata is retained where applicable
- no secret is exposed
- unauthorized mutation is blocked
- error/retry behavior does not cause uncontrolled spend
- UI slot respects approved aspect ratio/layout
- relevant tests pass

## Back Office visibility
This skill is development governance.

The future read-only Back Office Skills Registry may display:
- skill name
- purpose
- status
- version
- last updated
- applicable area
- approved tool/provider summary

The Back Office Media/AI configuration may separately display non-secret operational configuration such as enabled providers/models, prompt presets, limits, and provider configured/not-configured status.

Repository skill files remain the source of truth and must not be editable from normal Back Office UI.
