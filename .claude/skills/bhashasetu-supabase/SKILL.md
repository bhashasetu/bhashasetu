---
name: bhashasetu-supabase
description: Governs Bhasha Setu Supabase database, migrations, authentication, RLS, Storage, Edge Functions, secrets, generated types, and data-access discipline.
---

# Bhasha Setu Supabase Skill

## When to use
Use this skill whenever creating, modifying, reviewing, or debugging:
- PostgreSQL tables, columns, enums, indexes, constraints, or relationships
- Supabase migrations
- Row Level Security (RLS)
- Back Office authentication/authorization
- Supabase Storage buckets and policies
- Edge Functions
- Supabase Edge secrets
- generated database TypeScript types
- server/client Supabase access
- audit logging
- draft/verification/publish states
- database search

Use `bhashasetu-media` for detailed media workflows and `bhashasetu-content` for language/content governance.

## Source of truth
Follow this precedence:
1. Latest explicit user instruction
2. `CLAUDE.md`
3. Frozen approved architecture
4. This skill
5. Other applicable project skills
6. Existing migrations/schema
7. Existing application code

Do not silently change frozen architecture because a different schema is easier to code.

## Core architecture
Bhasha Setu uses:
- Supabase PostgreSQL for durable structured data
- Supabase Storage for managed production media
- Supabase Auth for Back Office authentication
- Supabase Edge Functions only where server-side Supabase execution is justified
- one shared backend for desktop website, mobile/Android experience, and Back Office

The Raspberry Pi/robot is not part of this cloud Supabase architecture unless explicitly introduced later.

The website/app are learning products, not preservation systems.

## Schema discipline
Database changes are migration-driven.

Never:
- alter production schema manually and leave migrations behind
- silently add tables/columns while implementing UI
- create duplicate tables for the same concept
- store repeated media URLs instead of relationships
- create a generic EAV/meta-field system when normal relational columns are clearer
- introduce an ORM unless explicitly approved

Before any schema change:
1. Check existing migrations/schema.
2. Confirm the requirement cannot be satisfied cleanly with the existing model.
3. Identify affected tables, policies, types, queries, Back Office screens, and public screens.
4. Create a migration.
5. Update generated TypeScript types after migration application.
6. Update relevant documentation if architecture materially changes.

## Frozen core data model
Use the approved architecture as the baseline. Core concepts include:

- `languages`
- `categories`
- `learning_entries`
- `learning_entry_aliases`
- `media_assets`
- `audio_metadata`
- `media_links`
- `community_content`
- quiz/play-and-learn entities where required
- structured page/content entities where required
- chatbot/help knowledge where required
- feedback/error reports
- app release metadata
- non-secret project configuration
- audit log

Do not add a table merely because it appeared in an older draft. Use only the frozen/current architecture and actual implementation requirements.

## Learning entries
`learning_entries` is the canonical verified learning-content record for words/phrases.

It should support the approved fields required by the product, including:
- language
- entry type
- native text
- transliteration
- English meaning
- Hindi meaning
- category
- verification/publication state
- featured status where required
- timestamps

Avoid separate near-identical `words` and `phrases` tables unless a future requirement genuinely demands different data models.

## Aliases
Use `learning_entry_aliases` for deterministic search variants such as:
- alternate spellings
- transliteration variants
- approved synonyms/search terms

Aliases must point to a canonical learning entry.

Do not let an LLM create unreviewed aliases directly into published data.

## Unified media model
Production image/audio/video files use a unified `media_assets` model.

`media_assets` identifies the managed asset and its storage/object metadata.

Audio-specific fields belong in a linked 1:1 `audio_metadata` record where applicable.

Use `media_links` to associate reusable assets with entities.

Conceptually:

`media_assets → media_links → learning_entry / community_content / page section / quiz / other approved entity`

`media_links.role` describes purpose, not file type.

Examples:
- `hero`
- `thumbnail`
- `pronunciation`
- `interview_video`
- `illustration`
- `og_image`
- `quiz_media`

`media_links` is intentionally polymorphic. PostgreSQL cannot enforce one foreign key across multiple target entity types. Validate allowed `entity_type`/`role` combinations in application/server logic and document this tradeoff.

## Community content
Use the approved consolidated community-content model for:
- story
- interview
- oral_history

Preserve explicit `content_type`.

Support appropriate relationships to:
- language
- person/speaker
- village/region where applicable
- image/audio/video media
- publication state

Do not collapse the semantic distinction between an interview and an editorial story.

## Status and publishing
Use explicit controlled states rather than ambiguous booleans where workflow matters.

Editorial content may use:
- draft
- published
- archived

Verified language content may use:
- draft
- pending_verification
- verified
- published
- archived

AI media may use:
- generated
- draft
- approved
- published
- archived

Enforce valid transitions in application/server logic where practical.

Do not publish unverified Warli/Katkari learning content.

## Authentication
V1 Back Office authentication should remain simple.

Use Supabase Auth.

Do not build a custom authentication system.

Do not add social login, organizations, multi-tenant accounts, complex RBAC, or enterprise identity features unless explicitly required.

At minimum:
- public users can access approved published public content
- authenticated authorized Back Office users can manage permitted content
- privileged server operations use server-side credentials only

If multiple admin roles become necessary, add the smallest role model that satisfies the requirement.

## RLS — mandatory
Enable RLS on exposed application tables where appropriate.

Public access should normally be read-only and limited to content intended for publication.

Principles:
- anonymous/public users: read published public records only
- Back Office users: authenticated access according to approved admin permissions
- sensitive/internal records: no anonymous access
- service-role operations: server-side only

Never use the service-role key in browser/client code.

Do not disable RLS as a shortcut to make a query work.

Test policies with both anonymous and authenticated contexts.

## Storage architecture
Supabase Storage holds actual production media.

UI reference images under `docs/ui-references/` are development references and do not belong in Supabase Storage.

Prefer a simple bucket model. Do not create a bucket per page or per language.

Use public delivery for genuinely public published learning media where appropriate.

Use private access/signed URLs only where the asset genuinely requires access control.

Do not proxy every public media request through Next.js merely to create signed URLs.

Storage paths should be predictable and avoid coupling to UI routes.

Do not expose sensitive originals if a public derivative is intended instead.

Detailed upload, metadata, AI-generation, approval, replacement, and where-used behavior is governed by `bhashasetu-media`.

## Secrets
Never store provider secrets in:
- source code
- Git
- public environment variables
- database configuration rows
- editable Back Office fields

Use:
- Supabase Edge Function secrets for secrets consumed by Edge Functions
- Vercel environment variables for secrets consumed by Next.js server-side routes/functions

Avoid duplicating the same secret across environments unless both execution environments genuinely require it.

The Back Office may display only status such as:
- OpenAI: Configured
- fal.ai: Configured

Never return or display the secret value.

## Supabase keys
Treat keys according to their privilege.

Browser-safe/public Supabase configuration may be used only as intended with RLS protecting data.

Privileged/service-role credentials:
- server-side only
- never bundled into client JavaScript
- never logged
- never returned through an API response

## Data access
Centralize Supabase client creation and data-access patterns.

Maintain clear separation between:
- browser client
- server client
- privileged server/service operations

Prefer server-side data access for privileged mutations and secret-dependent operations.

Do not scatter ad-hoc Supabase client initialization across components.

Do not let UI components contain complex database orchestration when it belongs in a data/service layer.

## Validation
Validate mutations before writing to the database.

Use approved TypeScript validation tooling such as Zod where appropriate.

Database constraints should still enforce important invariants.

Do not rely exclusively on client-side validation.

## Generated TypeScript types
Generate TypeScript types from the actual Supabase schema after relevant migrations are applied.

Treat generated database types as generated artifacts.

Do not manually edit generated schema types to make TypeScript errors disappear.

Fix the schema/query/application mismatch instead.

## Search
Language search is deterministic first.

Support the approved search sequence using PostgreSQL/query logic:
1. canonical exact match
2. approved alias match
3. English/Hindi/transliteration fields
4. partial match
5. PostgreSQL full-text/trigram only if justified
6. no verified result

Do not add vector search or embeddings for V1 unless a demonstrated requirement cannot be handled cleanly by deterministic search.

Do not call an LLM to fill a missing Warli/Katkari database result.

## Edge Functions
Use Edge Functions only when they provide a clear server-side benefit, such as:
- provider calls that should execute in Supabase
- secret-protected workflows
- controlled background/server operations supported by the platform

Do not move ordinary CRUD into Edge Functions unnecessarily.

Do not create an Edge Function merely because Supabase supports one.

Choose one execution location for a responsibility where practical. Avoid duplicating the same business logic in both Vercel server functions and Supabase Edge Functions.

## Audit trail
Important changes should be traceable.

Audit where appropriate:
- language content edits
- verification status changes
- publication changes
- media metadata/status changes
- important configuration changes
- marketing/public content changes

Capture useful fields such as:
- actor
- action
- entity type
- entity id
- timestamp
- relevant before/after data where appropriate

Do not audit every harmless read operation.

## Configuration
Non-secret runtime/editorial configuration may live in the approved project configuration model.

Examples:
- social URLs
- enabled provider names
- approved model names
- feature flags
- SEO defaults
- AEO defaults
- Android release metadata

Secrets never belong there.

Avoid turning configuration into an untyped dumping ground. Prefer explicit keys/types and validation.

## Migrations
Migration files must be:
- ordered
- deterministic
- reviewable
- safe for the current project state

A migration should have one coherent purpose.

Do not mix unrelated schema changes into a giant migration merely for convenience.

Before applying destructive changes:
- identify existing data impact
- prefer safe staged migration where needed
- obtain approval if data loss is possible

Never reset/delete production data as a shortcut.

## Seed data
Use seed data only for:
- stable system defaults
- development/test fixtures
- explicitly approved initial content

Do not fabricate Warli/Katkari translations as seed content.

Real language content must come from approved/verified project data.

## Performance
Keep V1 simple.

Use indexes for demonstrated query patterns such as:
- foreign keys
- status/publication filters
- language/category filters
- canonical/alias search where needed

Do not prematurely add:
- caching infrastructure
- read replicas
- complex materialized views
- vector databases
- queue systems

Measure first.

## Cost discipline
Stay within Supabase free-tier-friendly patterns where practical.

Avoid:
- unnecessary duplicate storage
- excessive transformations
- needless Edge Function calls
- proxying public assets through compute
- expensive database patterns where a simple indexed query works

Do not compromise correctness/security merely to save negligible cost.

## Local/dev vs production safety
Know which Supabase project/environment is being targeted before applying migrations or destructive operations.

Never assume a development command is harmless against production.

For destructive or irreversible operations, explicitly verify the target environment.

## Prohibited shortcuts
Do not:
- disable RLS to fix access problems
- expose service-role credentials
- store API secrets in database rows
- manually edit generated DB types
- hardcode Supabase record IDs into UI components
- duplicate media URLs across content tables
- create schema changes without migrations
- invent language seed data
- add vector/embedding infrastructure without demonstrated need
- create unnecessary Edge Functions
- proxy all public Storage media through application compute
- reset real data to resolve migration problems
- silently change the frozen architecture

## Implementation workflow
For Supabase work:
1. Read `CLAUDE.md`.
2. Read frozen architecture/current schema.
3. Load this skill and other applicable skills.
4. Identify the exact data/security requirement.
5. Inspect existing migrations and schema.
6. Propose the smallest compatible change.
7. Check RLS/security impact.
8. Create migration.
9. Apply to the correct environment only after approval/workflow permits.
10. Regenerate TypeScript database types.
11. Update data-access code.
12. Test anonymous/public behavior.
13. Test authenticated Back Office behavior.
14. Test privileged/server behavior where relevant.
15. Verify no secrets leak client-side.
16. Run relevant tests/build checks.
17. Document material schema changes.

## Completion checklist
Supabase work is complete only when:
- requirement is satisfied with the smallest reasonable schema change
- migration exists
- schema relationships/constraints are correct
- RLS is enabled/tested where applicable
- public users cannot access drafts/internal records
- Back Office authorized access works
- privileged credentials remain server-side
- Storage policy matches intended public/private behavior
- generated TypeScript types match schema
- validation exists for mutations
- no hardcoded record IDs were introduced
- no API secrets are stored in DB/code
- language data was not fabricated
- relevant audit behavior works
- tests/build pass
- destructive/data-loss risk is documented and approved where applicable

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

It must not expose Supabase secrets, service-role keys, connection credentials, or allow normal Back Office users to edit this repository skill.

The repository skill file remains the source of truth.
