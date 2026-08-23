---
name: bhashasetu-browser-e2e
description: Governs Bhasha Setu browser-based end-to-end QA across desktop website, responsive/mobile web, Back Office, CMS-to-public propagation, media, chat, authentication, accessibility basics, console/network health, screenshots, and regression testing.
---

# Bhasha Setu Browser / E2E QA Skill

## When to use
Use this skill whenever implementing, reviewing, validating, or releasing:
- desktop public website flows
- responsive/mobile web behavior
- Back Office flows
- CMS → public website/mobile content propagation
- authentication flows
- Media Library flows
- page creation/editing/publishing
- Warli/Katkari learning flows
- My BhashaSetu chat
- navigation and routing
- forms and interactive controls
- cross-viewport behavior
- browser console/network health
- accessibility basics
- screenshot/reference comparisons
- regression testing

Use:
- `bhashasetu-visual-qa` for pixel/reference visual comparison
- `bhashasetu-ui` for UI implementation rules
- `bhashasetu-content` for content truth/CMS behavior
- `bhashasetu-media` for media lifecycle
- `bhashasetu-chat` for chat behavior
- `bhashasetu-supabase` for data/security rules

## Source of truth
1. Latest explicit user instruction
2. `CLAUDE.md`
3. Frozen architecture/product scope
4. Approved UI references
5. Applicable project skills
6. Approved acceptance criteria
7. Existing implementation

Passing automated tests does not override an approved UI reference or product rule.

## Core principle
A feature is not complete because:
- code compiles
- a component renders
- unit tests pass
- Claude inspected the source
- one happy-path click worked

For user-facing functionality, validate the actual running product in a browser.

Use:

**Implement → run → exercise real flow → inspect → capture evidence → fix → rerun**

## Browser tooling
Use a maintained browser automation tool suitable for the project's stack.

Preferred direction for E2E automation:
- Playwright

Use browser developer/runtime evidence where useful:
- screenshots
- DOM state
- console errors
- failed network requests
- response status
- viewport behavior

Do not install multiple overlapping browser automation frameworks.

Do not introduce Selenium/Cypress/Puppeteer alongside Playwright without a demonstrated requirement.

## Tool installation rule
Do not install browser tooling merely because this skill exists.

When implementation/testing begins:
1. inspect existing dependencies
2. reuse an approved existing browser/E2E tool if suitable
3. otherwise install the minimum maintained tooling required
4. document why it was added

Prefer stable free/open-source tooling.

## Browser testing is not Visual QA
Browser/E2E QA and Visual QA are complementary.

### Browser/E2E asks:
- Does it work?
- Can the user complete the flow?
- Does data propagate correctly?
- Are routes/forms/buttons functional?
- Are there console/network failures?
- Does responsive behavior function?

### Visual QA asks:
- Does it match the approved design?
- Are spacing, typography, composition, imagery and proportions correct?

For approved-reference screens, both must pass.

## Test environments
Know which environment is under test:
- local/development
- preview/staging
- production

Never run destructive E2E tests against production data unless explicitly designed and approved for production-safe execution.

Prefer isolated test records and cleanup.

Do not assume a URL points to a non-production environment.

## Viewports
Test meaningful viewports rather than dozens of arbitrary device sizes.

At minimum for relevant public UI:
- approved desktop viewport/reference size
- common laptop/desktop width
- approved mobile/reference width
- a narrow mobile width
- one intermediate/tablet-like width where responsive layout materially changes

Back Office is desktop-only unless product scope changes.

Do not spend effort creating a separate mobile Back Office QA matrix.

## Responsive web vs mobile app
The responsive/mobile website and Android app may share visual/content patterns, but test according to actual implementation.

Do not claim native/mobile-app behavior was tested merely because responsive web passed.

If the Android app is a Capacitor-wrapped web application, browser E2E validates shared web flows, while packaging/device-specific behavior requires the appropriate release/device checks under the release skill.

## Smoke suite
Maintain a fast smoke suite for critical paths.

At minimum, as implemented:
- public Home loads
- primary navigation works
- Languages/Learn route loads
- one verified learning item renders
- linked approved audio can be triggered
- Stories & Voices route loads
- My BhashaSetu opens
- Back Office login works in test environment
- one core Back Office dashboard/content route loads

Smoke tests should be fast enough to run frequently.

## Public website flows
Test implemented public flows such as:
- Home
- About
- Languages
- Learn
- Stories & Voices
- My BhashaSetu
- Team
- FAQ
- APK/download route where applicable
- Contact/social links
- new CMS-created public pages

Validate:
- route works
- navigation state is correct
- published content appears
- draft content does not
- media loads
- CTA works
- no broken internal links
- no obvious overflow/layout break

## Learning flows
Test representative Warli and Katkari learning paths.

Include:
- browse language/category
- open learning item
- native text/transliteration/meaning display
- approved audio playback
- missing optional audio behavior
- search exact match
- alias match
- no-result behavior
- quiz/listen-repeat flows when implemented

Never create fake Warli/Katkari content merely to make an E2E assertion pass. Use approved fixtures/test records.

## CMS → public propagation
This is a critical integration path.

Test representative flows:

**Back Office create/edit → Draft → Preview → Publish → public render**

Validate:
- draft remains non-public
- preview shows intended content
- publish exposes correct content
- edits propagate as designed
- archive/unpublish removes public availability as designed
- slug/navigation behavior is correct
- media links remain intact

Do not test CMS only by checking database rows.

## New page creation
When structured page creation exists, test:
1. create page
2. set title/slug
3. add approved section types
4. enter text
5. select/upload media where needed
6. configure SEO/AEO fields where applicable
7. preview
8. publish
9. navigate to public URL
10. verify section ordering/content/media
11. archive/unpublish
12. verify public behavior

Also test:
- duplicate slug
- reserved slug
- invalid required fields
- unsupported section configuration
- draft visibility

Do not test arbitrary free-form layouts because the product intentionally does not provide a free-form page builder.

## Media flows
Test representative Media Library behavior:
- upload valid image
- upload valid audio
- upload video where supported
- reject invalid file
- metadata edit
- select existing media
- attach asset to content
- reuse same asset
- where-used
- replace safely
- archive
- blocked unsafe deletion

For AI image generation, use mocks/test provider behavior for routine automated E2E tests where possible.

Do not spend paid generation credits on every CI run.

A limited real-provider integration check may be run deliberately when provider integration itself needs validation.

## AI-generated media
When testing real generation:
- confirm explicit user action triggers generation
- prevent double submission
- confirm Draft status
- confirm result is ingested into Supabase Storage
- confirm provider temporary URL is not the durable public source
- confirm human approval is required
- confirm rejected media cannot be selected/published

Do not auto-publish generated media in test fixtures.

## Back Office
Test desktop Back Office flows according to implemented modules.

Representative coverage should include:
- login/logout
- dashboard
- learning content
- verification/publishing
- Media Library
- Stories/Voices/editorial content
- Pages
- Marketing where implemented
- Chat configuration where implemented
- project/configuration settings where implemented
- read-only Skills Registry where implemented

Verify permissions and destructive-action safeguards.

## Authentication and authorization
Test:
- unauthenticated Back Office access is blocked
- valid authorized login succeeds
- logout invalidates protected access
- public user cannot mutate content
- drafts/admin records are not exposed publicly
- privileged actions require appropriate authorization

Do not put production credentials into E2E source code.

Use approved test credentials/secrets from environment configuration.

## My BhashaSetu E2E
Test the routing behavior defined by `bhashasetu-chat`.

At minimum:
- verified language lookup
- alias lookup
- linked audio
- missing language item → not currently available
- platform FAQ/help
- guided-learning path where implemented
- unclear intent
- unrelated/out-of-scope request
- LLM provider unavailable
- provider not configured
- prompt-injection attempt
- request for secrets/system prompt
- attempt to access/edit admin content

Confirm deterministic language lookup still works when the LLM is disabled/unavailable.

Do not require paid LLM calls for the full automated suite; mock provider behavior where appropriate.

## Console health
For important E2E routes/flows, inspect browser console output.

Fail or investigate meaningful:
- uncaught exceptions
- hydration errors
- React errors
- failed resource loads
- repeated warnings indicating implementation defects

Do not fail releases merely because of harmless known third-party informational logs; document justified exceptions.

## Network health
Inspect critical network behavior where relevant.

Look for:
- unexpected 4xx/5xx
- failed media requests
- repeated API calls
- accidental request loops
- unauthorized data leakage
- excessive duplicate fetches
- requests to temporary AI-provider URLs from published content

Do not turn E2E into full performance observability; investigate material issues.

## Loading, empty and error states
Test more than the happy path.

Important components should behave sensibly for:
- loading
- empty dataset
- no search result
- missing optional media
- server/database error
- provider error
- slow response
- unauthorized access

Do not allow blank screens or infinite spinners.

## Forms
For important forms test:
- valid submission
- required fields
- invalid values
- duplicate submission
- server error
- success state
- keyboard submission where relevant
- disabled/loading state

Do not rely solely on client-side validation.

## Accessibility basics
E2E QA should catch obvious accessibility failures without turning V1 into a compliance bureaucracy.

Check:
- interactive elements reachable by keyboard where applicable
- visible focus
- buttons/links have accessible names
- form controls have labels
- images use appropriate alt behavior
- dialogs can be dismissed and focus behaves sensibly
- no obvious contrast/readability failure
- semantic headings are reasonable

Use automated accessibility tooling only if it integrates cleanly and does not replace manual judgment.

## Content integrity
Automated assertions must respect Bhasha Setu content rules.

Do not:
- fabricate endangered-language content
- mutate verified production records
- publish unverified fixtures
- describe website/mobile as preservation
- make tests depend on AI-generated language facts

Use controlled approved test fixtures.

## Test data
Create the smallest test dataset required.

Prefer deterministic seeded/test records.

Test records should be clearly identifiable and safe to clean up.

Do not continuously create orphaned records in shared environments.

Do not reset an entire database merely to run E2E tests.

## Selectors
Use resilient selectors.

Prefer:
- role
- accessible name
- label
- stable test id only where necessary

Avoid selectors tightly coupled to generated CSS classes or fragile DOM nesting.

Do not add test IDs everywhere by default.

## Waiting and timing
Use condition-based waits.

Wait for:
- expected element/state
- response
- route
- visible completion condition

Avoid arbitrary long sleeps/timeouts as a primary synchronization strategy.

Do not hide race conditions by increasing waits repeatedly.

## Screenshots
Capture screenshots when they provide useful evidence:
- approved-reference comparison
- failure diagnostics
- critical responsive states
- release evidence where required

Do not generate huge screenshot archives for every trivial assertion.

For approved UI reference screens, coordinate screenshot dimensions with `bhashasetu-visual-qa`.

## Visual regression
Do not automatically introduce broad pixel-snapshot regression across the entire product.

Approved UI references remain the primary visual truth.

Use targeted screenshot regression only for stable, high-value surfaces where it reduces future regressions without creating brittle maintenance.

## Cross-browser
Primary development may use Chromium-based automated testing.

Before release, test critical public flows in the supported browser set defined by the project/release requirements.

Do not multiply the full test matrix across browsers unless the product requirement justifies it.

At minimum, avoid shipping browser-specific assumptions without checking relevant Safari/WebKit behavior because mobile users may use iOS.

## Performance sanity
Browser QA should flag obvious user-facing performance defects:
- giant unoptimized media
- layout shifts
- repeated network loops
- blocking requests
- unusably slow route transitions
- excessive initial payload caused by implementation mistakes

Do not invent hard performance budgets unless the project defines them.

Optimize demonstrated problems first.

## External links and downloads
Test important external actions:
- social links
- contact links
- APK/download links
- video/external media links where applicable

Do not automate third-party services beyond what is necessary to verify the Bhasha Setu link/action.

## CI strategy
Keep CI predictable and cost-aware.

Recommended layers:
1. lint/type/build checks
2. fast smoke E2E
3. broader E2E for pull request/release as appropriate
4. targeted visual QA
5. paid-provider integration tests only deliberately

Do not make routine CI depend on paid AI generation or live LLM availability.

## Failure evidence
When an E2E test fails, capture useful evidence where supported:
- failing step
- screenshot
- trace
- relevant console error
- relevant network failure

Do not simply rerun flaky tests until they pass.

Diagnose and fix the underlying issue.

## Flaky-test policy
A flaky test is a defect in the test or product synchronization.

Do not:
- add blind retries as the first fix
- add arbitrary sleeps
- ignore recurring failures

Use retries sparingly for known external instability and document the reason.

## Security checks
Browser QA should verify obvious client-side security boundaries:
- no secrets in page source/client bundles/network payloads
- no service-role key exposed
- protected routes remain protected
- draft/admin content is not publicly queryable
- unauthorized mutations fail
- dangerous editor content does not execute arbitrary scripts

This complements, not replaces, backend/security review.

## Release gate relationship
Skill 8 (`bhashasetu-release`) decides release readiness.

This skill supplies browser/E2E evidence to that gate.

Do not declare the overall project production-ready solely because E2E passes.

## Prohibited shortcuts
Do not:
- declare user-facing work complete from code inspection alone
- treat visual QA and E2E as interchangeable
- run destructive tests against production casually
- fabricate Warli/Katkari test content
- spend paid AI credits on routine CI
- use arbitrary sleeps to mask race conditions
- rely on fragile CSS selectors
- ignore console/network failures
- rerun flaky tests until green without diagnosis
- expose production credentials in test code
- reset shared/production databases for tests
- test only happy paths
- claim Android/device behavior from browser testing alone
- add multiple overlapping browser automation frameworks

## Implementation workflow
For browser/E2E work:
1. Read `CLAUDE.md`.
2. Load this skill and applicable specialist skills.
3. Identify the user journey and environment.
4. Confirm test data/credentials are safe.
5. Implement or update the smallest useful test.
6. Exercise the real browser flow.
7. Inspect console/network behavior where relevant.
8. Validate error/empty/loading states.
9. Test meaningful responsive viewports.
10. Capture evidence when useful.
11. Run Visual QA separately where approved references exist.
12. Diagnose failures rather than masking them.
13. Keep routine tests independent of paid AI providers.
14. Clean up test data where required.
15. Report what was actually tested and what was not.

## Completion checklist
Browser/E2E work is complete only when:
- relevant real user flows pass in a browser
- desktop/mobile responsive behavior is tested where applicable
- Back Office remains desktop-only unless scope changes
- CMS → public propagation is validated where relevant
- drafts/private/admin content remain protected
- representative media flows work
- representative learning/audio flows work
- My BhashaSetu deterministic fallback is tested
- important error/empty/loading states are covered
- meaningful console/network errors are resolved
- selectors/waits are resilient
- routine CI does not spend paid AI credits
- test data is controlled
- accessibility basics are checked
- approved-reference screens also pass Visual QA
- test evidence clearly states environment and coverage
- no untested platform is falsely claimed as tested

## Back Office visibility
This skill is development governance.

The future read-only Back Office Skills Registry may display:
- skill name
- purpose
- status
- version
- last updated
- applicable area
- approved testing-tool summary

E2E test execution and detailed traces do not need to be exposed to ordinary Back Office users unless a future operational requirement explicitly adds that feature.

Repository skill files remain the source of truth and must not be editable from normal Back Office UI.
