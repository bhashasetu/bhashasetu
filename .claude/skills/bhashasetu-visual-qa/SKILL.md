---
name: bhashasetu-visual-qa
description: Governs screenshot-based visual validation of Bhasha Setu website, mobile/Android, and Back Office UI against approved reference images.
---

# Bhasha Setu Visual QA Skill

## When to use
Use whenever implementing or modifying a screen with an approved UI reference, completing responsive UI work, changing shared UI that materially affects approved screens, or validating claimed pixel-accurate work.

Use `bhashasetu-ui` for implementation rules. This skill governs visual verification and correction.

## Source of truth
1. Latest explicit user instruction
2. `CLAUDE.md`
3. Exact approved reference image
4. `bhashasetu-ui`
5. Other approved UI references for shared patterns
6. Existing implementation

Approved reference inventory:
- Desktop Website: 8
- Mobile / Android: 5
- Desktop Back Office: 5
- Total: 18

References:
- `docs/ui-references/web/`
- `docs/ui-references/mobile/`
- `docs/ui-references/admin/`

Never treat an implementation screenshot as a new approved reference.

## Core rule
Never declare a referenced screen visually complete from code inspection alone.

Required loop:

**Implement → Render → Capture → Compare → Diagnose → Correct → Re-render → Re-compare**

Repeat until material deviations are resolved or explicitly accepted.

## Reference selection
Before QA:
1. Identify the exact screen.
2. Identify its approved reference filename.
3. Confirm desktop web, mobile/Android, or desktop Back Office.
4. If no exact reference exists, do not claim pixel accuracy. Treat the screen as derived and flag materially new design decisions.

## Viewport discipline
Match the reference viewport/aspect ratio as closely as practical.

If exact dimensions are known, use them. Otherwise derive a reasonable viewport from the reference, record it, and keep it constant across comparison iterations.

Test other responsive widths separately after reference matching.

## Deterministic capture
Before capture:
- wait for required fonts
- wait for intended page data/media state
- use stable test data
- remove unrelated transient overlays
- match reference scroll position
- keep browser zoom at 100% unless justified
- keep viewport constant across iterations

Never hide defects merely to improve the screenshot.

## Comparison order

### 1. Structure
Check section order, major regions, navigation, columns, dominant balance and content density.

### 2. Geometry
Check container widths, section heights, alignment, margins, padding, gaps, component dimensions and media ratios.

### 3. Typography
Check hierarchy, family treatment, size relationships, weight, line height, wrapping and alignment.

Do not identify a font as approved merely from resemblance.

### 4. Styling
Check backgrounds, borders, radii, shadows, separators, icons, buttons, badges and contrast.

Screenshot-derived exact values remain provisional until validated.

### 5. Media
Check crop, aspect ratio, focal point, object position, placeholder behavior, logo fidelity and robot fidelity.

Never use the reference screenshot itself as production media.

### 6. States
Where relevant, check loading, empty, error, selected, active, disabled, focus and missing-media states.

Static screenshots do not authorize invented interactions.

## Deviation classification

### Critical
Wrong structure/navigation, missing major section, wrong hierarchy, materially wrong responsive layout, wrong logo/robot treatment, or generic-template substitution.

### Major
Visible proportion/spacing errors, wrong typography hierarchy, wrong component dimensions, wrong media crop/aspect ratio, major alignment errors, or materially wrong color/background treatment.

### Minor
Small spacing, radius, shadow, typography-metric or icon-alignment differences.

Fix Critical and Major deviations before Minor polish.

## Correction rule
Fix the implementation, not the screenshot.

Do not:
- add brittle one-off offsets that break responsiveness
- use screenshot overlays as page content
- hide elements only for QA
- hardcode viewport hacks without justification
- replace maintainable layout logic with arbitrary absolute positioning unless genuinely required

If the same deviation appears across screens, prefer correcting the shared component/token.

## Visual QA tooling
Prefer existing/free tooling:
- Playwright screenshots
- browser screenshots
- available image overlay/diff tooling
- deterministic viewport capture

Do not add paid visual-regression services without approval.
Do not install a visual-diff dependency if existing tooling is sufficient.

## Pixel-accuracy language
"Pixel-accurate" means systematic comparison against the approved reference with material visible deviations corrected.

It does not require mathematically identical pixels where production content, browser/font rendering, responsive adaptation, or unavailable source design tokens legitimately differ.

Document remaining differences precisely.

## Responsive QA
Reference matching and responsive QA are separate.

After reference matching:
- test relevant narrower/wider widths
- verify no overflow
- verify readability
- verify intentional media crops
- verify navigation usability
- verify tap targets
- verify layout stability

Where desktop and mobile references both exist, validate each independently.

## Back Office QA
Prioritize information hierarchy, sidebar/header proportions, table readability, form alignment, filters/search, status visibility, density and approved modal/drawer proportions.

Do not make Back Office decorative at the expense of clarity.

## QA record
For each approved screen completed, keep a lightweight record:
- route/screen
- approved reference filename
- viewport
- date checked
- Critical deviations count/status
- Major deviations count/status
- accepted differences
- final status: Pass / Needs Review

Do not put routine QA screenshots into production media storage.

## Prohibited shortcuts
Do not:
- declare visual completion from code inspection
- compare against memory or the wrong reference
- silently redesign for convenience
- invent exact design tokens and claim they were supplied
- skip mobile because desktop matches, or vice versa
- modify approved references
- overwrite references with implementation screenshots
- treat generated screenshots as approved references
- introduce paid tooling without approval

## Workflow
1. Load `CLAUDE.md`.
2. Load `bhashasetu-ui`.
3. Identify exact approved reference.
4. Render at target viewport.
5. Capture screenshot.
6. Compare structure.
7. Compare geometry.
8. Compare typography.
9. Compare styling.
10. Compare media.
11. Classify Critical / Major / Minor deviations.
12. Fix Critical.
13. Fix Major.
14. Re-render and capture.
15. Repeat comparison.
16. Fix meaningful Minor deviations.
17. Test responsive behavior separately.
18. Record QA status.
19. Do not mark complete until Critical = 0 and Major = 0 unless the user explicitly accepts a documented deviation.

## Completion checklist
- exact reference identified
- viewport recorded
- implementation screenshot captured
- structure, geometry, typography, styling and media compared
- Critical deviations = 0
- Major deviations = 0 unless explicitly accepted
- responsive widths tested
- no overflow/layout breakage
- approved references unchanged
- no screenshot used as production content
- accepted differences documented
- status recorded as Pass or Needs Review

## Back Office visibility
This skill is development governance, not public functionality.

The future read-only Back Office Skills Registry may display skill name, purpose, status, version, last updated, applicable area and approved tool summary.

The repository skill file remains the source of truth and must not be editable from normal Back Office UI.
