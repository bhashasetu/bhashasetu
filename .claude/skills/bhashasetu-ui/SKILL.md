---
name: bhashasetu-ui
description: Governs implementation of Bhasha Setu public website, mobile/Android responsive UI, and desktop Back Office UI from approved visual references.
---

# Bhasha Setu UI Skill

## When to use
Use this skill whenever creating, modifying, reviewing, or refactoring:
- public website UI
- mobile-responsive UI
- Android-facing responsive UI
- Back Office UI
- shared UI components
- page/section layouts
- navigation
- forms, tables, cards, dialogs, filters, states, or responsive behavior

This skill does not define database schema, media generation internals, chat routing, or release workflows. Use the relevant project skill for those concerns.

## Source of truth
Follow this precedence:
1. Latest explicit user instruction
2. `CLAUDE.md`
3. Approved UI reference image for the exact screen
4. Other approved UI references for shared design patterns
5. Approved product/specification documents
6. Existing code

The currently approved UI reference set contains:
- 5 Desktop Website screens
- 3 Mobile/Android screens
- 5 Desktop Back Office screens

A missing screen does not imply an approved design exists.

## Core implementation rule
Approved UI references are implementation references, not inspiration.

For a referenced screen:
- reproduce the composition as closely as technically practical
- preserve hierarchy, proportions, alignment, spacing relationships, typography treatment, component shapes, media ratios, and responsive intent
- do not redesign, modernize, simplify, embellish, or substitute a different UI pattern without approval

Do not freeze guessed screenshot values as facts. Exact fonts, hex values, widths, spacing, radii, shadows, and breakpoints inferred from screenshots remain provisional until validated during implementation.

## Missing-screen rule
If a required screen has no approved reference:
1. Reuse existing approved components and design patterns.
2. Avoid introducing a materially new visual pattern.
3. Describe the proposed layout.
4. Flag it for approval before implementing a materially new design direction.

Do not invent screens merely to complete navigation.

## CMS and media rule
When implementing a CMS-managed page or section, classify visible content before coding.

- Editorial text → CMS field
- Public image → managed media slot
- Public audio → managed media/audio asset
- Public video → managed media/video asset
- CTA destination/copy → CMS where editorial
- SEO/AEO content → CMS where applicable
- Charts/waveforms → generated UI when data-driven
- Social icons → code/SVG/icon component; social URLs come from configuration

If an image shown in a UI reference is not supplied as a production asset:
- build the correct visual placeholder
- connect the slot to the Media Library
- support Select Existing Media
- support Manual Upload
- support Create with AI where appropriate
- provide the expected aspect ratio/presentation requirement
- do not hardcode the screenshot image as production content

The detailed media workflow is governed by `bhashasetu-media`.

## Production assets
- Never redraw or reinterpret the official Bhasha Setu logo.
- Use the approved logo asset.
- When depicting the Bhasha Setu robot, use the approved robot reference/asset.
- Do not replace missing production assets with arbitrary stock imagery.

## Responsive implementation
Desktop and mobile belong to the same product and design system.

Where both desktop and mobile references exist:
- match both references
- do not merely shrink the desktop screen
- preserve mobile hierarchy and interaction priorities shown in the reference

Where only one reference exists:
- derive the other viewport using established approved components and responsive patterns
- keep the result conservative
- flag any materially new layout decision

Prefer mobile-first responsive CSS where practical.

## Interaction rule
Static screenshots do not authorize invented behavior.

Do not add features such as:
- sticky/fixed navigation
- keyboard shortcuts
- carousels
- bookmarks
- collapsible navigation
- audio speed controls
- pagination
- elaborate hover effects
- animation systems

unless supported by requirements, existing architecture, an approved reference, or explicit instruction.

Normal accessibility behavior such as focus states and appropriate feedback is still required.

## Component discipline
Reuse components when their structure and behavior are genuinely shared.

Examples may include:
- navigation
- buttons
- form controls
- language badges
- verified indicators
- learning-entry cards
- audio controls
- story/interview cards
- filters
- admin tables
- admin detail panels
- status badges
- dialogs

Do not force visually different elements into one over-configurable component.

Do not create abstraction before there are real repeated patterns.

## Approved UI tooling
Use the project-approved frontend stack:
- Next.js
- React
- TypeScript
- the project's approved CSS/styling approach
- Lucide or the approved icon library where appropriate

Prefer native HTML/CSS/browser capabilities before adding UI dependencies.

Do not install a component framework or design system such as Material UI, Ant Design, Chakra, Bootstrap, or another large UI kit unless explicitly approved.

Do not add a second icon library without approval.

## Accessibility baseline
UI work must include:
- semantic HTML
- logical heading hierarchy
- keyboard accessibility
- visible focus states
- usable labels
- alt-text support for CMS images
- adequate tap targets
- readable contrast
- reduced-motion support where motion exists
- accessible audio/video controls where applicable

Do not alter the approved visual direction unnecessarily in the name of accessibility; solve both requirements together.

## States
Any data-driven component must account for relevant:
- loading
- empty
- error
- success
- disabled
- missing-media

states.

Do not leave broken image icons, undefined text, layout collapse, or blank panels.

## Prohibited shortcuts
Do not:
- hardcode editorial content merely to match a screenshot
- hardcode production media URLs into page components
- use screenshot images as the live page
- invent unsupplied language content
- introduce a generic template in place of the approved design
- add visual libraries because implementation is easier
- declare pixel accuracy without visual comparison
- silently change the approved navigation or information hierarchy
- create new design tokens from guesses and present them as approved values

## Implementation workflow
For each referenced screen:
1. Identify the exact reference.
2. Inventory visible components and content/media slots.
3. Identify reusable existing components.
4. Determine CMS-managed vs code-managed elements.
5. Implement structure and responsive behavior.
6. Connect CMS/media fields where required.
7. Add states and accessibility.
8. Render at the reference viewport.
9. Invoke the `bhashasetu-visual-qa` skill.
10. Correct deviations.
11. Repeat until accepted.

## Completion checklist
Before UI work is marked complete:
- correct approved reference was used
- no unapproved redesign occurred
- CMS-managed content is not improperly hardcoded
- missing media uses the required managed placeholder/workflow
- production logo/robot assets are handled correctly
- responsive behavior is tested
- loading/empty/error/missing-media states exist where relevant
- accessibility baseline is met
- no unnecessary UI dependency was added
- no browser console errors attributable to the UI
- visual QA has been performed against every applicable approved reference
- material deviations are documented rather than hidden

## Back Office visibility
This skill is a development governance file. It is not executable product functionality.

The Back Office Configuration area should expose a read-only **Development / Project Configuration** view that can show:
- skill name
- purpose
- status: Active
- version
- last updated
- applicable area
- approved tool summary

It must not allow normal Back Office users to edit the repository skill file.

The repository copy of this skill remains the source of truth.
