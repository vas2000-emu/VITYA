# DFM checks (moldsim layer)

Located in [lib/moldsim/](../lib/moldsim/) (the math) and [app/api/moldsim/](../app/api/moldsim/) (the route wrappers). Each route is a thin POST handler around a pure function in `lib/moldsim/*.ts`.

## What's actually implemented

All routes run on the Node runtime, take a JSON body matching their `*Request` type, and return a JSON response matching the `*Response` type (see [lib/moldsim/types.ts](../lib/moldsim/types.ts)).

### `/api/moldsim/cost`
Closed-form cost model. Material cost from a price/kg table, tooling cost from a complexity + cavity-count + undercut multiplier, processing cost from cycle time × machine rate, labor + overhead as fixed fractions. Outputs `total_cost_per_part`, `total_tooling_cost`, a 5-bucket `cost_breakdown` percentage, `parts_per_hour`, and `recommendations[]`.

### `/api/moldsim/cooling`
Fourier-number-based cooling time: `t = -ln((Te - Tm) / (Ti - Tm)) × s² / (π² × α)` where `s` is half wall-thickness, `α` is thermal diffusivity. Cycle time = cooling time + fixed fill/pack/eject overhead. Outputs `cooling_time`, `cycle_time`, `thermal_diffusivity`, `fourier_number`, and `recommendations[]`.

### `/api/moldsim/filling`
Uses Cross-WLF viscosity at the operating shear rate (estimated from wall thickness and fill time), checks if flow length / wall thickness exceeds the material's typical max, and recommends gate count. Outputs `max_flow_length`, `flow_ratio`, `estimated_fill_time`, `recommended_pressure`, `average_viscosity`, `is_fillable`, `recommendations[]`.

### `/api/moldsim/manufacturing`
The "DFM score." Rule-based: starts at 100, deducts points for wall thickness out of range, draft angle < 1°, sharp inside corners, undercuts, non-uniform wall. Outputs `overall_score` (0-100), `is_manufacturable` boolean, `issues[]` (each with `severity` / `category` / `issue` / `recommendation`), and a one-line `summary`.

### `/api/moldsim/materials`, `/density`, `/viscosity`
Material database access and standalone viscosity (Cross-WLF) / density (Tait equation) calculators. The dashboard doesn't currently use these directly; they're available for future analysis pages.

## What's NOT implemented (and would need real physics)

- **Real geometry-driven analysis** — every check above uses scalar inputs (`wall_thickness`, `min_draft_angle`, `num_undercuts`). It doesn't read a STEP file, doesn't look at the 3D mesh. To make these accurate, you'd need:
  - **Wall thickness sampling**: build a BVH on the user's mesh (`three-mesh-bvh` is already a dependency), shoot rays from each face along its inverted normal, measure distance to the opposite face. Take the distribution, not just a single scalar.
  - **Draft angle per face**: dot product of each face normal with the pull direction. Map to per-face severity.
  - **Undercut detection**: from the pull direction (assume +Z by default), find face groups whose silhouette would be trapped by the surrounding geometry. Non-trivial — usually done with depth-buffer-from-pull-direction tricks.
  - **Sharp corner detection**: edge crease analysis — compute angle between adjacent face normals; flag below a threshold.
  - **Wall uniformity**: variance of the thickness sampling above.

- **Flow simulation** — the current filling model is a back-of-envelope flow-length / wall ratio check. Real mold-flow needs FEM (Moldflow, Moldex3D) or at minimum a simplified Hele-Shaw 2D fill solver. Not in scope here.

- **Warpage / shrinkage** — would need anisotropic shrink coefficients per material + a structural solver. Not implemented.

- **Gate optimization** — currently we just count gates and recommend "use 2 gates if flow ratio > 200". Real version uses fill-balancing optimization.

## How the dashboard consumes these

[store/useResultsStore.ts](../store/useResultsStore.ts) `runMoldsim()` calls `runFullAnalysis()` from [lib/moldsim-api.ts](../lib/moldsim-api.ts), which fires all four endpoints in parallel via `Promise.all` with the part's preset inputs from [lib/partSimInputs.ts](../lib/partSimInputs.ts).

The responses map into `analysis.riskSummary[0..3]` and `analysis.overallScore`. The dashboard's issue cards / recommendations / hotspot regions stay hardcoded in [lib/mockMoldAnalysis.ts](../lib/mockMoldAnalysis.ts) — moldsim doesn't generate that rich text.

## Adding a new check

1. Add the math in `lib/moldsim/<your-check>.ts` as a pure function.
2. Add types to `lib/moldsim/types.ts` (`<Your>Request`, `<Your>Response`).
3. Add the route wrapper in `app/api/moldsim/<your-check>/route.ts`.
4. Add a client helper in `lib/moldsim-api.ts`.
5. Either consume it in an existing page or add a new `app/analysis/<your-check>/page.tsx`.
