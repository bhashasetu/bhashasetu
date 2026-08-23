---
name: bhashasetu-release
description: Governs Bhasha Setu release readiness, Git/GitHub workflow, quality gates, Vercel deployment, Supabase migration safety, production verification, Capacitor/Android APK builds, secrets, rollback, release evidence, and the definition of done.
---

# Bhasha Setu Release Skill

## When to use
Use this skill whenever preparing, reviewing, approving, deploying, publishing, packaging, rolling back, or declaring complete:
- production releases
- Vercel deployments
- Supabase schema migrations
- Git/GitHub release workflow
- environment configuration
- production secrets
- domain/configuration changes
- Android/Capacitor APK builds
- GitHub Actions release workflows
- release QA
- rollback/recovery
- post-deployment verification
- release notes/evidence
- "done", "ready", "production-ready", or "released" claims

Use the applicable specialist skills before this release gate:
- `bhashasetu-ui`
- `bhashasetu-visual-qa`
- `bhashasetu-supabase`
- `bhashasetu-media`
- `bhashasetu-content`
- `bhashasetu-chat`
- `bhashasetu-browser-e2e`

## Source of truth
1. Latest explicit user instruction
2. `CLAUDE.md`
3. Frozen architecture/product scope
4. This skill
5. Applicable specialist skills
6. Approved UI references
7. Approved release acceptance criteria
8. Existing production configuration and implementation

A green deployment does not override failed product, security, content, E2E, or visual requirements.

## Core principle
A release is not complete because:
- code was committed
- code was pushed
- Vercel deployed successfully
- TypeScript compiled
- tests passed locally
- an APK file was produced
- a migration executed

Release means the intended product version passed its required gates, reached the intended environment, and was verified there.

Use:

**Prepare → validate → deploy/migrate → verify → record → monitor/rollback if required**

## Bhasha Setu deployment model
Current approved direction:
- source control: GitHub
- web application: Vercel
- durable cloud data/storage/auth: Supabase
- Android application: Capacitor-based APK built through approved tooling/GitHub Actions
- APK distribution: side-load/download flow unless product scope changes
- browser E2E: Playwright direction under the E2E skill
- no VPS required
- no dedicated GPU required

Do not introduce VPS/container infrastructure merely for release convenience.

## Environment separation
Know the target environment before any release action.

At minimum distinguish:
- development
- preview/staging where configured
- production

Never assume a command is safe because it worked in development.

Before production:
- verify target Vercel project/environment
- verify target Supabase project
- verify required environment variables exist
- verify domain/URL configuration
- verify migration target
- verify release branch/commit

Destructive operations require explicit awareness of production impact.

## Git discipline
Production releases must originate from committed, reviewable repository state.

Before release:
- working tree should be understood/clean as appropriate
- identify exact commit
- ensure intended changes are pushed
- ensure unrelated experimental files are not included
- ensure secrets are not committed
- ensure generated artifacts are handled according to project policy

Do not release uncommitted mystery state.

Do not force-push or rewrite shared release history casually.

## Branch workflow
Use the project's approved branch strategy.

Do not invent a complicated GitFlow process for a small project.

The release should clearly identify:
- source branch
- target branch/environment
- commit SHA

If branch protection/PR workflow is configured, respect it.

Do not bypass required checks merely to deploy faster.

## Release gates
Before production release, run the gates relevant to the change.

Typical gates:
1. dependency/install integrity
2. lint
3. type checking
4. unit/component tests where present
5. production build
6. database/migration review where relevant
7. Browser/E2E smoke tests
8. broader E2E for affected critical flows
9. Visual QA for affected approved-reference screens
10. content/media integrity checks
11. security/secrets checks
12. production deployment
13. post-deploy smoke verification

Do not run irrelevant expensive gates merely for ceremony, but do not skip a gate affected by the change.

## Definition of done
Claude must distinguish:
- implemented
- locally verified
- preview deployed
- production deployed
- production verified
- Android APK built
- Android APK device-verified

Never use "done" ambiguously.

When reporting completion, state what level was actually reached.

## Vercel deployment
For web releases:
- use the connected/approved GitHub → Vercel deployment workflow
- prefer preview deployment before production for material changes
- verify build output
- verify environment variables are available to the correct environment
- do not expose server secrets to client bundles
- verify intended domain/route after production deployment

Do not manually create a parallel hosting path unless explicitly approved.

## Preview before production
For material UI/content/feature changes, prefer:
**branch/commit → Vercel preview → QA → production**

Use preview URLs for Browser/E2E and Visual QA where practical.

Do not treat preview success as production verification.

## Supabase migration release safety
Database releases require extra care.

Before applying a production migration:
1. inspect migration contents
2. identify destructive/data-loss risk
3. identify RLS/policy impact
4. identify affected application queries/types
5. confirm target Supabase project
6. ensure application/migration ordering is safe
7. plan rollback/forward-fix approach

Do not reset production databases.

Do not manually alter production schema outside the migration workflow and leave repository history inconsistent.

## Migration compatibility
Prefer backward-compatible staged migrations for risky changes.

When application and schema changes must deploy together, reason about ordering.

Examples:
- add nullable/new structure first
- deploy compatible application
- backfill if needed
- enforce stricter constraint only after data is ready

Do not drop/rename live columns blindly when the deployed application may still reference them.

## RLS/security gate
For Supabase-affecting releases verify:
- RLS remains enabled where required
- anonymous users see only intended published data
- Back Office authorization still works
- service-role credentials remain server-side
- drafts/private/admin data remain protected

A migration that "works" but weakens RLS is a failed release.

## Secrets and environment variables
Secrets are configured outside Git.

Verify required secrets by presence/status, never by printing values.

Relevant environments may include:
- Vercel server-side environment variables
- Supabase Edge secrets where approved Edge Functions use them
- GitHub Actions secrets for build/release operations where genuinely required

Never:
- commit `.env` secrets
- echo secrets into logs
- expose secrets in screenshots
- place provider keys in client-visible variables
- duplicate secrets across systems without a real execution need

## Media/content release checks
When affected, verify:
- public media resolves from durable approved storage
- no temporary provider URLs are published
- drafts/rejected media remain private/unselected
- published pages do not reference deleted/broken assets
- verified learning content remains accurate
- unpublished/unverified Warli/Katkari content is excluded
- website/mobile are not described as preservation systems
- SEO/AEO metadata reflects approved content

## My BhashaSetu release checks
When chat is affected, verify:
- deterministic verified lookup
- alias lookup
- linked audio
- missing language item stops correctly
- platform help uses approved content
- LLM-down/provider-not-configured fallback
- secrets remain server-side
- rate/context/output controls
- prompt-injection boundaries
- chat does not become an open-domain or language-invention system

Do not block deterministic learning lookup on live LLM availability.

## Browser/E2E release gate
Use `bhashasetu-browser-e2e`.

At minimum for material production releases:
- run smoke coverage
- run affected critical flows
- inspect meaningful failures
- resolve flaky tests rather than blindly retrying

Routine CI should not depend on paid AI generation or live LLM availability.

## Visual release gate
For screens with approved references, use `bhashasetu-visual-qa`.

Do not declare a reference-driven screen visually complete merely because E2E passed.

If a release intentionally changes an approved design, update/approve the reference rather than silently accepting visual drift.

## Accessibility sanity
Before release, ensure affected critical flows have no obvious accessibility regression:
- keyboard access where applicable
- focus visibility
- labels/accessibility names
- reasonable headings
- appropriate alt behavior
- usable dialogs/forms

Do not claim formal accessibility certification unless actually performed.

## Performance sanity
Check for obvious release regressions:
- broken/huge media
- accidental request loops
- severe layout shift
- excessive duplicate requests
- unusably slow critical interaction
- client bundle accidentally containing server-only code/secrets

Do not invent arbitrary performance targets unless defined by the project.

## Dependency safety
Before adding/upgrading dependencies for a release:
- confirm necessity
- prefer maintained packages
- avoid overlapping libraries
- review material breaking changes
- keep lockfile committed
- run build/tests after changes

Do not perform broad dependency upgrades immediately before release without need.

## GitHub Actions
Use GitHub Actions for repeatable CI/build workflows where useful, including:
- lint/type/build
- Playwright E2E
- Android/Capacitor APK build
- release artifacts

GitHub-hosted runners provide temporary compute; no VPS is required.

Keep workflows minimal and deterministic.

Do not place paid AI generation in routine CI.

## Android / Capacitor release
The Android application uses the approved Capacitor-based direction.

A web production release and an Android APK release are separate release outcomes.

For APK builds:
1. verify shared web application state
2. verify Capacitor configuration
3. sync/build Android assets
4. build APK using approved GitHub Actions/toolchain
5. retain identifiable artifact/version
6. verify APK installs on an actual supported Android device before claiming device readiness
7. verify critical app flows on device
8. verify network/API/media behavior
9. verify download/side-load instructions where applicable

Do not claim Android validation from browser E2E alone.

## APK signing
If signing is required for the approved distribution workflow:
- keep keystore/signing secrets out of Git
- use approved secret storage
- document recovery/ownership responsibility
- do not regenerate signing identity casually

Loss of signing credentials can create future update problems.

Do not expose signing material in logs/artifacts.

## Versioning
Use simple consistent versioning appropriate to the project.

Track enough to identify:
- web release commit
- schema migration state
- APK version/version code where applicable
- release date
- material changes

Do not introduce elaborate release-train/versioning bureaucracy.

## Release notes
For material releases, record concise notes:
- what changed
- commit/version
- migrations applied
- major configuration changes
- known limitations
- rollback/forward-fix note where relevant

Do not produce verbose release documents for trivial changes.

## Post-deploy verification
After production deployment, verify the actual production environment.

At minimum as applicable:
- Home loads
- critical routes load
- published content/media render
- one representative learning/audio flow
- My BhashaSetu deterministic path
- Back Office protected route/auth
- no obvious console/network production failure
- intended domain/HTTPS behavior

Do not assume Vercel's "deployment successful" means the product works.

## Monitoring after release
For meaningful releases, observe enough to catch immediate regressions:
- deployment/build errors
- application errors where available
- failed API/provider calls
- critical user-flow failures

Do not build an enterprise observability platform for V1.

Use available platform logs/diagnostics first.

## Rollback strategy
Every material production release should have a practical recovery path.

Possible recovery:
- Vercel rollback/redeploy known-good commit
- application forward-fix
- safe database forward migration
- feature/config disable where supported

Database rollback is not always equivalent to reversing SQL.

Prefer forward-fix migrations when reversing could destroy data.

Do not promise rollback unless the actual recovery path is understood.

## Failed release
If a critical gate fails:
- stop release progression
- report the failed gate
- diagnose
- fix
- rerun affected gates

Do not waive failures silently.

If production is already affected:
- assess user/data/security impact
- rollback or forward-fix using the safest known path
- verify recovery

## Production data protection
Never:
- reset production database
- delete production Storage broadly
- seed fake language content into production
- use destructive E2E fixtures against real records
- overwrite verified content merely to make release tests pass

Backups/recovery capabilities should be understood before high-risk data migrations.

## External providers
For OpenAI/fal.ai or other approved providers:
- provider availability is not proof of Bhasha Setu readiness
- verify configured/not-configured behavior
- verify failure fallback
- avoid real paid calls in routine CI
- use deliberate integration checks when necessary

Do not block the entire product release on optional AI functionality if the approved product supports a safe disabled/fallback state.

## Domain and public URLs
Before public launch verify:
- correct production domain
- HTTPS
- canonical URLs
- redirects where required
- sitemap/robots behavior where implemented
- social/OG URLs where relevant
- APK/download links where applicable

Do not expose preview/staging URLs as canonical production URLs.

## Release evidence
Keep enough evidence to support the release claim:
- commit SHA
- CI/check result
- migration identifiers where applicable
- deployment identifier/URL
- E2E result
- visual QA result where applicable
- APK artifact/version where applicable
- known limitations

Do not create excessive evidence archives for trivial changes.

## Release permissions
Do not perform irreversible or high-impact production operations merely because Claude can technically execute them.

Respect the project's approval workflow.

Before destructive production data/schema operations or other irreversible actions, surface the impact and obtain required approval.

## Prohibited shortcuts
Do not:
- call a release complete because code compiles
- call production verified because preview passed
- claim Android/device verification from browser testing
- bypass failed required checks
- reset production data
- expose/print secrets
- run destructive E2E against production
- apply unreviewed migrations
- silently weaken RLS
- publish temporary AI-provider media URLs
- publish unverified language content
- make routine CI depend on paid AI calls
- introduce VPS infrastructure unnecessarily
- perform broad dependency upgrades without need
- blindly reverse database migrations
- hide known release failures
- claim rollback capability without understanding it

## Release workflow
For a material web release:
1. Read `CLAUDE.md` and applicable skills.
2. Identify exact release scope and commit.
3. Verify environment/target.
4. Review dependency/config changes.
5. Review migrations/RLS where applicable.
6. Run lint/type/tests/build.
7. Deploy preview where appropriate.
8. Run Browser/E2E.
9. Run Visual QA for affected reference screens.
10. Verify content/media/chat-specific gates.
11. Apply production migration in safe order where required.
12. Deploy production.
13. Run production smoke verification.
14. Record commit/deployment/migration evidence.
15. Monitor immediate failures.
16. Roll back/forward-fix if critical verification fails.

For Android:
1. complete relevant shared-web gates
2. build identifiable APK
3. preserve signing/version discipline
4. install on actual Android device
5. verify critical flows
6. record artifact/version and result
7. only then claim device readiness

## Completion checklist
A production release may be called complete only when applicable items pass:
- exact commit identified and pushed
- intended environment confirmed
- no secrets committed/exposed
- required lint/type/test/build gates pass
- migrations reviewed/applied safely
- RLS/security behavior remains correct
- Browser/E2E affected flows pass
- Visual QA affected reference screens pass
- content/media integrity passes
- My BhashaSetu boundaries/fallback pass where affected
- Vercel production deployment succeeds
- actual production smoke test passes
- domain/routes/media work
- known limitations are stated
- recovery path is understood
- release evidence is recorded

An Android release additionally requires:
- APK artifact/version identified
- signing handled safely where applicable
- actual Android installation succeeds
- critical device flows verified

If any required item is not performed, report the narrower truthful status rather than "released and verified."

## Back Office visibility
This skill is development/release governance.

The future read-only Back Office Skills Registry may display:
- skill name
- purpose
- status
- version
- last updated
- applicable area
- approved release-tool summary

The Back Office may separately display safe non-secret operational information such as:
- current web version/commit
- current APK version
- last successful release timestamp
- provider configured/not-configured state
- release status where implemented

Do not expose:
- deployment secrets
- signing credentials
- service-role keys
- GitHub tokens
- environment-variable values

Repository skill files remain the source of truth and must not be editable from normal Back Office UI.
