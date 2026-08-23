#   
**CLAUDE.md — Bhasha Setu**  
  
**1. Project Identity**  
  
**Project:** Bhasha Setu  
**Current language scope:** Warli and Katkari only  
**Primary domain:** mybhashasetu.in  
  
Bhasha Setu has three product surfaces:  
  
	1.	Desktop Website — public learning experience  
	2.	Mobile Website / Android App — same core learning platform adapted for mobile and later packaged with Capacitor  
	3.	Desktop Back Office — one shared administration system for website + Android app  
  
The website and Android app are **learning platforms only**. They are not preservation tools.  
  
Do not introduce Toda, Aimol, Nihali or other languages unless explicitly instructed.  
  
**2. Source of Truth**  
  
Before implementing any feature, read the supplied project references.  
  
Mandatory reference files:  
  
	1.	Bhasha_Setu_Website_Android_App_Student_Friendly_WRO_Guide.docx  
	2.	Bhasha_Setu_UI_Showcase.pdf  
  
Precedence:  
  
	1.	Latest explicit user instruction  
	2.	This CLAUDE.md  
	3.	Approved UI reference files  
	4.	Product/specification documents  
	5.	Existing project code  
  
Do not silently resolve conflicts. Flag them.  
  
**3. Core Product Principle**  
  
Bhasha Setu is a **CMS-driven learning platform**.  
  
Back Office → Supabase Database + Supabase Storage → Website + Mobile / Android App  
  
The public website and app should read content from Supabase rather than hardcoding editorial content.  
  
**4. CMS-Managed vs Code-Managed Content**  
  
**CMS-managed**  
  
Normally manage from Back Office:  
  
	●	Page headings and editorial copy  
	●	Hero content  
	●	Language descriptions  
	●	Warli/Katkari words and phrases  
	●	Hindi and English meanings  
	●	Native text and transliteration  
	●	Audio, images and video  
	●	Stories and interviews  
	●	Quiz content  
	●	Homepage modules  
	●	WRO video  
	●	Social links  
	●	Marketing campaigns  
	●	SEO/AEO fields  
	●	Chatbot approved knowledge/help content  
	●	App release information  
	●	Prompt presets  
	●	Non-secret project configuration  
  
**Code-managed**  
  
Keep in code unless explicitly made configurable:  
  
	●	Routing  
	●	Navigation mechanics  
	●	Save / Cancel / Search labels  
	●	Validation messages  
	●	Loading states  
	●	Error states  
	●	Component logic  
	●	Authentication flows  
	●	Security rules  
	●	Data access  
	●	Fixed design primitives  
  
Do not turn the project into a generic page builder.  
  
**5. Global Page Implementation Rule**  
  
Whenever a new CMS-managed page or section is added:  
  
	1.	Inspect the approved UI reference.  
	2.	Identify every content field.  
	3.	Identify every media slot.  
	4.	Build the public component.  
	5.	Build the matching Back Office controls.  
	6.	Bind it to Supabase.  
	7.	Add loading, empty and error states.  
	8.	Add SEO/AEO fields where relevant.  
	9.	Test desktop and mobile.  
	10.	Compare visually with the approved UI.  
  
Do not hardcode temporary content and "CMS-ify later".  
  
**6. Pixel-Accurate UI Rule**  
  
Approved UI references are **implementation references, not inspiration**.  
  
Match:  
  
	●	layout  
	●	spacing  
	●	typography hierarchy  
	●	dimensions  
	●	alignment  
	●	border radius  
	●	colors  
	●	component proportions  
	●	card proportions  
	●	media aspect ratios  
	●	responsive behavior  
	●	section order  
  
Do not redesign, simplify, embellish or substitute patterns unless explicitly instructed.  
  
A UI page is not complete until it is rendered at the target viewport, screenshotted, compared to the reference, and visible deviations are corrected.  
  
**7. Design System Discipline**  
  
Use one consistent project design system.  
  
The official Bhasha Setu bridge logo must remain unchanged.  
  
Never ask an AI image model to redraw or reinterpret the logo.  
  
Use the supplied Bhasha Setu robot reference whenever the robot is depicted.  
  
**8. Media Library — Mandatory Architecture**  
  
Media is a first-class system.  
  
Every public image, audio and video should be a managed media asset.  
  
Do not scatter raw media URLs across page code. Use media IDs / references.  
  
Media actions:  
  
	●	Preview  
	●	Select existing  
	●	Upload  
	●	Edit metadata  
	●	Replace  
	●	Download  
	●	Archive  
	●	Delete  
	●	Where used  
	●	Publish status  
  
Use archive / soft delete by default. Warn before deleting an asset that is currently used.  
  
**9. Image Metadata**  
  
Every public image should support:  
  
	●	title  
	●	description  
	●	alt text  
	●	caption  
	●	credit  
	●	source type  
	●	language relevance  
	●	category  
	●	location / village  
	●	creator / photographer  
	●	consent status  
	●	copyright / permission status  
	●	original filename  
	●	MIME type  
	●	file size  
	●	width  
	●	height  
	●	focal point  
	●	status  
	●	created by  
	●	created at  
	●	updated at  
  
AI-generated images should also store:  
  
	●	AI provider  
	●	model  
	●	prompt  
	●	prompt preset  
	●	seed where available  
	●	generation date  
	●	generated by  
	●	approval status  
  
**10. Missing Media Rule**  
  
If the approved UI shows an image, illustration, audio or video that has not been supplied:  
  
**Do not invent or hardcode final media.**  
  
Implement the media slot and matching Back Office workflow.  
  
For image slots, provide:  
  
	1.	Select Existing Media  
	2.	Manual Upload  
	3.	Create with AI  
  
Also create an editable default generation prompt based on:  
  
	●	exact page  
	●	exact section  
	●	approved UI  
	●	required aspect ratio  
	●	Bhasha Setu visual rules  
	●	Warli/Katkari context where relevant  
  
AI-generated media enters **Draft** and requires human approval before publication.  
  
Public pages must gracefully handle missing media.  
  
**11. AI Image Generation**  
  
AI image generation is a Back Office Media capability.  
  
Approved providers may include:  
  
	●	fal.ai  
	●	FLUX models through fal.ai  
	●	OpenAI image generation where justified  
  
Cost discipline:  
  
	1.	Reuse approved media  
	2.	Crop/transform existing media  
	3.	Edit existing media  
	4.	Use smart prompt presets  
	5.	Generate one image  
	6.	Regenerate only if rejected  
	7.	Consider LoRA only when repeated consistency problems justify it  
  
Do not generate four variants by default.  
  
Create prompt presets for:  
  
	●	Homepage hero  
	●	Warli learning illustration  
	●	Katkari learning illustration  
	●	Story thumbnail  
	●	Interview thumbnail  
	●	Quiz illustration  
	●	Social creative  
	●	WRO promotional visual  
  
Users must be able to edit the prompt before generation.  
  
Do not introduce LoRA by default. Use it only when prompt presets + reference images + model settings cannot achieve required consistency.  
  
**12. Audio Library**  
  
Warli and Katkari audio are core learning assets.  
  
Suggested fields:  
  
	●	Language  
	●	Entry type  
	●	Linked learning entry  
	●	Native text  
	●	Transliteration  
	●	English meaning  
	●	Hindi meaning  
	●	Category  
	●	Audio file  
	●	Duration  
	●	Speaker  
	●	Speaker code  
	●	Region / village  
	●	Recording date  
	●	Recording source  
	●	Consent status  
	●	Public playback permission  
	●	Verification status  
	●	Verified by  
	●	Verification date  
	●	Audio quality  
	●	Transcript checked  
	●	Tags  
	●	Internal notes  
	●	Featured  
	●	Created by  
	●	Updated by  
	●	Created at  
	●	Updated at  
	●	Where used  
  
Actions:  
  
	●	Play  
	●	Replace  
	●	Edit metadata  
	●	Download  
	●	Link / unlink  
	●	Archive  
	●	Delete  
	●	Show where used  
  
Do not duplicate the same audio file across multiple public features.  
  
**13. Back Office Scope**  
  
Desktop-only for V1.  
  
Modules:  
  
	1.	Dashboard  
	2.	Languages  
	3.	Categories  
	4.	Words & Phrases  
	5.	Audio Library  
	6.	Media Library  
	7.	Stories & Interviews  
	8.	Play & Learn  
	9.	Homepage Content  
	10.	Marketing  
	11.	My BhashaSetu  
	12.	SEO / AEO  
	13.	Feedback / Reported Errors  
	14.	App Releases  
	15.	Configuration  
	16.	Audit Log  
  
Keep it understandable for students. Do not build a large enterprise CMS.  
  
**14. Marketing Module**  
  
Marketing should manage:  
  
	●	WRO campaigns  
	●	announcements  
	●	featured story  
	●	featured interview  
	●	featured word / phrase  
	●	homepage highlights  
	●	website/app banners  
	●	social assets  
	●	social links  
	●	QR destinations  
	●	campaign start/end dates  
	●	CTA label  
	●	CTA destination  
	●	audience  
	●	publish status  
	●	basic views/clicks where implemented  
  
Marketing uses media assets from the shared Media Library.  
  
**15. SEO and AEO**  
  
SEO/AEO must be considered during content modeling.  
  
Support Back Office fields for:  
  
	●	SEO title  
	●	meta description  
	●	canonical URL  
	●	OG title  
	●	OG description  
	●	OG image  
	●	index/noindex  
	●	page summary  
	●	FAQs where genuinely displayed  
	●	sources  
	●	last reviewed date  
	●	structured-data settings  
  
Prefer structured fields such as:  
  
	●	What is Warli?  
	●	Where is Warli spoken?  
	●	What is Katkari?  
	●	Where is Katkari spoken?  
	●	Common words  
	●	Common phrases  
	●	Cultural context  
	●	Sources  
  
Do not hide all useful information inside the chatbot.  
  
Use appropriate JSON-LD where justified.  
  
**16. Search — Deterministic First**  
  
Language Explorer should use:  
  
	1.	Exact match  
	2.	Alias/synonym match  
	3.	English field  
	4.	Hindi field  
	5.	Transliteration  
	6.	Partial match  
	7.	PostgreSQL full-text / trigram if needed  
	8.	Honest no-result state  
  
Do not use an LLM for basic search.  
  
Do not invent a Warli or Katkari answer.  
  
**17. My BhashaSetu Chat Assistant**  
  
My BhashaSetu is a controlled learning/help assistant.  
  
It is **not an autonomous AI agent**.  
  
Use a borrowed production-ready chat UI / SDK where practical instead of rebuilding chat plumbing.  
  
The assistant should support streaming chat, structured responses and rich learning cards.  
  
**Role 1 — Verified language retrieval**  
  
For Warli/Katkari language queries:  
  
	●	search verified database  
	●	return stored text and meanings  
	●	play stored native-speaker audio  
	●	do not invent language content  
  
**Role 2 — Platform help**  
  
Answer questions about how to use Bhasha Setu.  
  
**Role 3 — Guided learning**  
  
Organize existing verified content into:  
  
	●	short lessons  
	●	quizzes  
	●	guided journeys  
	●	"teach me 5 words" experiences  
  
Routing principle:  
  
normal code → database/search → approved help content → LLM only if still necessary  
  
**18. LLM-Last Rule**  
  
Hard rule:  
  
**existing code → structured database lookup → deterministic TypeScript logic → browser/native platform capability → approved free libraries → external APIs → paid APIs → LLM last**  
  
Never use an LLM when a normal query, rule, parser, search function or existing library can solve the task reliably.  
  
Do not create autonomous agents.  
  
Do not give an LLM authority over Warli/Katkari translations.  
  
**19. Secrets and Environment Variables**  
  
Never place private API keys in browser/client code.  
  
	●	Supabase Edge Function secrets: store keys used by Supabase Edge Functions.  
	●	Vercel Environment Variables: store keys used by Next.js server routes/functions.  
	●	Avoid duplicating secrets across environments without a clear reason.  
  
The Back Office Configuration screen may show:  
  
	●	OpenAI: Configured / Not configured  
	●	fal.ai: Configured / Not configured  
  
Never display secret values.  
  
**20. Back Office Configuration**  
  
Manage non-secret project settings such as:  
  
	●	enabled providers  
	●	preferred image provider  
	●	approved model names  
	●	chat model  
	●	LLM fallback enabled/disabled  
	●	AI image generation limits  
	●	prompt presets  
	●	social URLs  
	●	website identity settings  
	●	logo/media IDs  
	●	SEO defaults  
	●	AEO defaults  
	●	analytics configuration  
	●	3D enabled/disabled  
	●	feature flags  
	●	Android release metadata  
  
Do not bury important project settings in scattered constants.  
  
**21. 3D Usage**  
  
3D must be purposeful.  
  
Approved high-value use:  
  
	●	interactive Bhasha Setu robot  
	●	optional subtle depth/parallax  
	●	optional robot hotspots  
  
Preferred stack when 3D begins:  
  
	●	Three.js  
	●	React Three Fiber  
	●	Drei  
  
Requirements:  
  
	●	lazy load  
	●	compressed GLB/GLTF  
	●	static poster fallback  
	●	mobile fallback where needed  
	●	reduced-motion support  
  
Do not turn every card/decorative element into 3D.  
  
**22. Technology Stack**  
  
Primary stack:  
  
	●	Next.js  
	●	React  
	●	TypeScript  
	●	CSS / approved styling approach  
	●	Supabase PostgreSQL  
	●	Supabase Storage  
	●	Vercel  
	●	GitHub  
	●	Capacitor  
	●	GitHub Actions  
	●	Zod  
	●	React Hook Form  
	●	Lucide or approved icon library  
	●	Playwright  
	●	Three.js / React Three Fiber / Drei when 3D begins  
	●	OpenAI for approved LLM/image use  
	●	fal.ai / FLUX for approved image generation  
  
Do not add overlapping frameworks or libraries without justification.  
  
**23. Dependency Rule**  
  
Do not install dependencies "just in case".  
  
Before adding a package:  
  
	1.	Check existing code.  
	2.	Check approved project libraries.  
	3.	Prefer mature, free/open-source, actively maintained packages.  
	4.	Avoid duplicate packages.  
	5.	Explain substantial new dependencies before adding them.  
  
Install feature-specific libraries only when that feature begins.  
  
**24. Database Discipline**  
  
Do not change schema silently.  
  
All schema changes require:  
  
	●	justification  
	●	migration  
	●	updated types  
	●	updated documentation  
	●	consideration of existing data  
  
Use relationships rather than repeating content/media URLs everywhere.  
  
**25. Content Accuracy**  
  
Never invent:  
  
	●	Warli translations  
	●	Katkari translations  
	●	native-language text  
	●	speaker information  
	●	cultural facts  
	●	community claims  
  
If verified content is unavailable, display an honest no-result state.  
  
**26. Draft / Review / Publish**  
  
Editorial:  
  
	●	Draft  
	●	Preview  
	●	Published  
	●	Archived  
  
Language content:  
  
	●	Draft  
	●	Pending Verification  
	●	Verified  
	●	Published  
	●	Archived  
  
AI media:  
  
	●	Generated  
	●	Draft  
	●	Approved  
	●	Published  
	●	Archived  
  
AI-generated public media requires human approval.  
  
**27. Audit Trail**  
  
Record important changes where practical:  
  
	●	who changed it  
	●	what changed  
	●	when  
	●	old value  
	●	new value  
  
Especially for language content, media metadata, verification, marketing and published page content.  
  
**28. Accessibility**  
  
Support:  
  
	●	semantic headings  
	●	keyboard navigation  
	●	visible focus  
	●	image alt text  
	●	readable contrast  
	●	accessible audio controls  
	●	captions/transcripts where available  
	●	appropriate mobile tap targets  
	●	reduced-motion preference  
  
**29. Analytics**  
  
Keep analytics simple and purposeful.  
  
Useful events:  
  
	●	page viewed  
	●	Start Learning clicked  
	●	Warli selected  
	●	Katkari selected  
	●	search performed  
	●	search no-result  
	●	audio played  
	●	story/interview played  
	●	quiz completed  
	●	chatbot opened  
	●	chatbot query type  
	●	WRO video played  
	●	APK download  
  
Do not introduce heavy paid analytics without approval.  
  
**30. Project Skills**  
  
Before implementing a feature, load and follow the relevant project skill.  
  
Expected skill areas:  
  
	●	bhashasetu-ui  
	●	bhashasetu-visual-qa  
	●	bhashasetu-supabase  
	●	bhashasetu-media  
	●	bhashasetu-content  
	●	bhashasetu-chat  
	●	bhashasetu-browser-e2e  
	●	bhashasetu-release  
  
Each skill should define:  
  
	●	when to use it  
	●	approved tools  
	●	workflow  
	●	implementation rules  
	●	completion checklist  
  
Do not ignore an applicable skill.  
  
**31. Browser / Visual QA**  
  
Browser automation is for user-facing QA, not a substitute for normal code tests.  
  
Expected E2E:  
  
	●	admin login  
	●	create/edit/archive media  
	●	upload audio  
	●	create Warli/Katkari entry  
	●	attach media  
	●	publish  
	●	verify desktop  
	●	verify mobile  
	●	search entry  
	●	play audio  
	●	test no-result  
	●	test chatbot routing  
	●	test missing media  
	●	verify responsive behavior  
  
**32. Completion Checks**  
  
Before marking a task complete:  
  
	●	TypeScript typecheck passes  
	●	lint passes  
	●	production build passes  
	●	relevant tests pass  
	●	no browser console errors  
	●	no exposed secrets  
	●	no broken media  
	●	loading state exists  
	●	empty state exists  
	●	error state exists  
	●	desktop tested  
	●	mobile tested  
	●	pixel comparison completed for approved UI work  
	●	CMS linkage verified  
	●	no hardcoded editorial content unless explicitly approved  
  
**33. Initial Development Strategy**  
  
Do not start with the entire website.  
  
Prove one vertical slice:  
  
	1.	Back Office  
	2.	Add one real Warli learning entry  
	3.	Attach one real audio asset  
	4.	Attach one image asset  
	5.	Store metadata in Supabase  
	6.	Publish  
	7.	Display on desktop Learn page  
	8.	Display on mobile  
	9.	Find through Language Explorer  
	10.	Play native-speaker audio  
  
This proves:  
  
Back Office → Supabase DB + Storage → Desktop Website → Mobile  
  
**34. First Architecture Task**  
  
Before production UI code:  
  
	1.	Read CLAUDE.md.  
	2.	Read both mandatory reference files.  
	3.	Read applicable skills.  
	4.	Audit architecture.  
	5.	Produce:  
	●	repository structure  
	●	Supabase schema  
	●	storage/bucket design  
	●	Back Office module map  
	●	CMS-managed vs code-managed matrix  
	●	secrets/environment map  
	●	dependency plan  
	●	first vertical-slice plan  
	●	risks/contradictions  
	●	migration sequence  
	6.	Stop for approval.  
  
Do not begin full implementation until architecture review is approved.  
  
**35. Final Principle**  
  
Bhasha Setu should be:  
  
	●	visually polished  
	●	technically understandable  
	●	CMS-driven  
	●	media-aware  
	●	verification-first  
	●	cost-conscious  
	●	deterministic where possible  
	●	AI-assisted only where useful  
	●	LLM-last  
	●	respectful of Warli and Katkari language accuracy

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
