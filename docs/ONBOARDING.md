# Onboarding

You're cloning VITYA. Here's the 5-minute path to a running dev server.

## Prereqs

- **Node** 20+ (tested on 25)
- **pnpm** 9+ (`npm install -g pnpm` if you don't have it)

## Clone → run

```bash
git clone https://github.com/vas2000-emu/VITYA.git
cd VITYA
pnpm install        # installs deps + runs husky prepare → git hooks wired
cp .env.example .env.local
# edit .env.local and add OPENAI_API_KEY=sk-... if you want the AI chat to work
pnpm dev            # http://localhost:3001
```

That's it. The first install will approve sharp's native build (pnpm-workspace.yaml controls that). Subsequent installs are silent.

## What you get

- **`/`** — sign-in landing page (any email/password works — it's a mock auth gate). Once signed in, the workspace renders with a 3D part, feature tree, AI Assistant, and Manufacturing panel.
- **`/results`** — MoldLocal dashboard. Auto-fires the moldsim API on load and shows live cost/cooling/DFM scores. Switch parts in the sidebar.
- **`/analysis/{costing,draft,thickness,undercut,on-demand}`** — deep-dive pages, each consuming the moldsim API.
- **`/api/ai/chat`** — OpenAI proxy. Server-side route; requires OPENAI_API_KEY in env.
- **`/api/moldsim/*`** — local simulation endpoints (cost, cooling, filling, manufacturing, materials, density, viscosity). No external service needed.
- **`/api/report`** — generates a PDF report for the current part via react-pdf.

## 60-second tour

1. **Sign in** — type anything in the form or click Google/GitHub. All paths just toggle `isAuthenticated`.
2. **Look at the 3D viewport.** Drag to rotate, scroll to zoom. The bottom-right gizmo follows your camera angle; click an axis to snap to that view.
3. **Click a feature in the left tree** (Top Plane, Front Plane, Right Plane) — camera snaps to that preset view.
4. **Click "Load STL"** at the bottom-left of the viewport. Pick "Load sample STL" or drag any `.stl` onto the canvas.
5. **Click "Reports"** in the top toolbar → `/results`. Watch the LoadingScreen play its phases; live API responses populate the score cards.
6. **Click an issue** (Undercut / Draft / Thin wall), then "How do I fix it?" → "Apply fix". The 3D mesh region pulses red→green during the apply animation; score tweens up.
7. **Click "PDF"** in the dashboard header — opens the generated report.
8. **Navigate to `/analysis/on-demand`** → "Request Quote" on any shop → modal handshake.
9. **Back on `/`, click AI Assistant** → type a question. Goes to OpenAI via the `/api/ai/chat` route (requires API key).

## Pre-commit hook

The repo has a secret-scanner pre-commit hook (husky + lint-staged + secretlint with the recommended rule preset). It blocks commits containing private keys, OAuth tokens, AWS keys, GitHub PATs, etc. If it fires, fix the staged content — don't `--no-verify`.

## Common gotchas

- **WebGL context lost** — if Chrome reclaims the GL context (you have ~8+ tabs of the app open), you'll see a "Restart 3D" overlay. Click it. Closing other tabs prevents recurrence.
- **`pnpm dev` defaults to port 3001** (not 3000) — set in `package.json` scripts.
- **`ignoreBuildErrors: true`** in [next.config.mjs](../next.config.mjs) — hackathon velocity. Re-enable strict TS before shipping anything.
