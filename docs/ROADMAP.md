# Roadmap & honest assessment

What's prototype, what'd make it shippable, what'd make it defensible. Written so anyone post-hackathon picking this up doesn't have to re-derive what's real vs. what's polish.

## What's prototype-only

- **Authentication.** `setAuthenticated(true)` on any click. No real OAuth, no sessions, no accounts.
- **3D geometry.** Three procedural parts (bracket, phoneCase, droneArm) defined in code; user STL uploads work but don't get analyzed against the moldsim API (the API takes scalar inputs, not geometry).
- **Heatmap regions.** Hand-authored AABBs per part in `lib/mockMoldAnalysis.ts`. Real analysis would derive these from BVH ray casts or face-normal classification.
- **AI suggestion cards.** Hardcoded in the store. Only the chat is LLM-backed.
- **Supplier quote flow.** Fake 3-second handshake → fake confirmation. No supplier APIs integrated.
- **PDF report.** Real PDF generation, but the content is the same mock + live-moldsim mix the dashboard shows.

## What's actually real

- **moldsim API surface.** Cost / cooling / filling / DFM math from first principles (Cross-WLF viscosity, Fourier cooling, etc.). Inputs are scalars but the math is correct. See [dfm-checks.md](./dfm-checks.md).
- **OpenAI chat.** `gpt-4o-mini`, non-streaming, real round-trip. See [ai-integration.md](./ai-integration.md).
- **Dashboard live-API path.** When you load `/results`, the score cards are populated from real `/api/moldsim/*` responses, not the mock baseline.
- **Pre-commit secret scanner.** husky + lint-staged + secretlint with the recommended preset; blocks commits with AWS keys, private keys, OAuth tokens, GitHub PATs, etc.
- **STL upload.** Real STL parsing via three-stdlib's STLLoader; the loaded mesh renders in the workspace viewport.

## To reach a sellable MVP (~2–3 months, focused team)

1. **Real auth.** Clerk or Auth.js with Google / GitHub OAuth. Account model, session persistence, password recovery.
2. **Postgres + S3.** Save uploaded parts, analysis runs, applied fixes, chat history per user.
3. **Stripe.** Per-analysis billing or subscription tiers.
4. **Real supplier directory.** 5+ Michigan shops with real capabilities, lead times, contact APIs (or at minimum a "send to shop" email flow).
5. **STEP support.** `opencascade.js` for STEP→mesh conversion in-browser, or server-side via OpenCascade. ~half-day of integration; ~10MB WASM blob.
6. **Geometry-driven DFM.** Wall thickness via BVH ray-casts on the uploaded mesh; draft via face-normal vs. pull-direction dot products; undercut via silhouette analysis from the pull direction.
7. **Re-enable strict TypeScript.** `ignoreBuildErrors: true` was kept on for hackathon velocity; turn it off and fix the fallout before shipping.

## To reach a defensible product (~6–12 months)

The non-code moats:

- **Apply-fix to user geometry.** Currently we animate a color change. A real "fix" needs a CAD kernel (OpenCascade is the open option; ParaSolid is the licensed one) to actually modify the user's STEP/STL. This is the line between "DFM linter" and "real CAD tool" — and it's where every competitor stops or moves to expensive licensing.
- **Cost model that's accurate enough not to embarrass you.** Get 3 design partners (Michigan molders), feed real quotes back into the cost model, iterate until your number is within 15% of theirs. No amount of math compensates for missing shop-specific data.
- **Supplier API integrations.** Email handoff is fine for v1; what shops actually want is an API to push quote requests into their existing job management system. Building those integrations is relationship work, not coding work.
- **IP / data trust.** Industrial customers won't send CAD to a startup without a clear story on: data retention, encryption at rest, who has access, deletion guarantees. ITAR/EAR compliance if you ever touch defense. This is paperwork + procedures, not code, but it's a hard prereq.

## The fundamental question

Do you go **deep** (best DFM linter for Michigan ABS injection-molded parts under 200mm) or **broad** (general moldability for everyone, everywhere)? Deep is faster to ship, easier to validate, easier to defend. Broad is the bigger market but the path where 18 months in you're still building geometry algorithms and have zero customers.

The hackathon prototype leans deep (specifically: Michigan supplier readiness, AB/PC/PA6 plastics, single-cavity to multi-cavity range, parts <200mm). That positioning is the most defensible starting point; widen later.

## What this branch ships (May 2026, feat/demo-upgrade)

- r3f viewport with STL upload + drop-up menu + axes gizmo + heatmap pulse on apply-fix
- Multi-part library (3 parts) with cross-store sync between dashboard and workspace
- Dashboard auto-fires moldsim API on mount and on part switch; live API badge + error banner
- PDF report export via react-pdf
- 3D hover tooltips on issue regions (click to focus side panel)
- Supplier quote modal with fake handshake
- Bug-fix bundle: ~20 dead clicks + store actions + loading edge cases on initial branch
- Refactor PR field-name mismatches surgically fixed across 4 broken pages
- Pre-commit secret scanner (husky + secretlint)
- Full docs/ folder (this one)

## What's still on the wishlist

- Streaming chat replies
- Contextual AI prompts (feed the current analysis into the system prompt)
- Real STL geometry analysis (BVH wall thickness, etc.)
- STEP file support
- Persisted state (chat history, applied fixes survive reload)
- CI-side secretlint run (currently only pre-commit)
- E2E tests (Playwright)
