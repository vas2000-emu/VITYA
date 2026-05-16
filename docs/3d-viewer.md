# 3D viewer

Located in [components/viewport/](../components/viewport/). Built on `@react-three/fiber` + `@react-three/drei` + `three-stdlib`. Single WebGL context across the app.

## File layout

```
ViewportContainer.tsx     thin shell: Toolbar + STLDropzone wrapping Scene
viewport/
  Scene.tsx               <Canvas> + lighting + ContactShadows + Grid + GizmoHelper
  Part.tsx                the actual mesh — STL or procedural geometry
  CameraController.tsx    OrbitControls + view-preset tweens + feature-tree bindings
  ViewportToolbar.tsx     header overlay: view presets, tool toggle, zoom, grid, heatmap
  STLDropzone.tsx         drag-and-drop wrapper + drop-up menu (Load sample / Upload / Clear)
  WebGLContextLossOverlay.tsx  fallback panel when GL context is reclaimed
  partGeometry.ts         procedural BufferGeometry for bracket / phoneCase / droneArm
```

## Camera conventions

Standard three.js: **X right, Y up, Z toward viewer**. The bottom-right axes gizmo in the viewport reflects this — red=X, green=Y, blue=Z. It rotates with the camera; clicking an axis snaps to that view.

View presets:

| Preset | Camera position | What you see |
|---|---|---|
| `home` / `isometric` | `[220, 160, 220]` | three-quarter view from upper-right-front |
| `top` | `[0, 320, 0.001]` | looking straight down |
| `front` | `[0, 0, 320]` | looking from +Z toward the part |
| `right` | `[320, 0, 0]` | looking from +X toward the part |

The tiny `0.001` Y nudge in `top` keeps OrbitControls from going gimbal-locked.

## State (lives in `useAppStore`)

- `viewportActiveView: ViewportPreset | null` — current preset name; null = user has dragged off any preset
- `viewportTool: 'rotate' | 'pan'` — what drag does
- `viewportGrid: boolean` — show/hide the infinite grid
- `viewportHeatmap: boolean` — show/hide per-issue mesh coloring
- `viewportZoomNudge: number` — toolbar zoom buttons increment/decrement; CameraController watches the delta
- `uploadedSTL: string | null` — Blob URL when user uploaded an STL
- `currentPartId: 'bracket' | 'phoneCase' | 'droneArm'` — which procedural geometry to show when no STL is uploaded

## STL upload

Bottom-left drop-up menu in `STLDropzone`:

- **Load sample STL** — fetches `/parts/bracket.stl` (a real STL we ship in `public/parts/`, generated from the procedural bracket via `scripts/generate-sample-stl.mjs`). Tests the full STL-load path with one click.
- **Upload .stl from computer** — file picker, accepts `.stl` only.
- **Clear & revert to demo geometry** — drops the uploaded STL.

Plus: dragging an STL onto the canvas works at any time.

Loaded STLs are auto-centered and auto-scaled to a max dimension of 160 units so they fit the same camera presets regardless of the source file's units.

## Heatmap

Per-issue vertex coloring. `partGeometry.ts` returns a non-indexed `BufferGeometry`; `Part.tsx` walks triangles, tests each centroid against each issue's `region` (axis-aligned bounding box stored in `lib/mockMoldAnalysis.ts`), and paints the vertices accordingly.

States:
- Default: Y-gradient (navy bottom → sky-blue top) for visual depth
- Issue region (heatmap on, not fixed): severity color (rose / amber / emerald)
- Issue region (fixed): green
- Issue region (pendingFixId === issue.id): `useFrame` lerp red ↔ green via `sin(time * 3)`

The pulse animation is the apply-fix "wow moment". `pendingFixId` is set by `useResultsStore.applyFix()` for 1.5s before committing the fix.

The viewport heatmap respects `viewportHeatmap` (toggle in the toolbar). Uploaded STLs skip heatmap entirely — their geometry doesn't correspond to known issue regions.

## Hover tooltips

`Part.tsx` registers `onPointerMove` / `onPointerOut` / `onClick` on the mesh. The raycast hit's world-space `point` is tested against each issue's `region` AABB; first match wins. A drei `<Html>` renders a severity-tinted card near the hit point. Clicking the part calls `selectIssue(hover.issue.id)` so the side panel jumps to the same issue.

## WebGL context recovery

`Scene.tsx` registers `webglcontextlost` / `webglcontextrestored` listeners. On loss:

1. Immediately call `WEBGL_lose_context.restoreContext()`
2. Retry at 250ms, 1000ms, 3000ms
3. If still lost at 5s, force a hard remount by bumping the Canvas `key`
4. If THAT also fails by 8s, show the `WebGLContextLossOverlay` with two buttons: "Restart 3D" (soft retry) and "Reload page" (hard fallback)

Most HMR-induced losses recover invisibly within 1s.

## Limitations

- **STL only.** No STEP support. Adding STEP needs `opencascade.js` (~10MB WASM, fiddly).
- **No interactive selection of mesh faces/edges.** Hover regions are AABB-tested against hardcoded issue boxes, not picked from real topology.
- **Geometry is procedural for the 3 demo parts.** No CSG, no real CAD kernel, no feature tree → geometry binding.
- **Heatmap regions are hand-authored per part** in `lib/mockMoldAnalysis.ts`. A real version would derive them from CAD analysis (BVH wall thickness, face-normal draft, silhouette undercut).
