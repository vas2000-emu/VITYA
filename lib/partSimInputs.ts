/**
 * Per-part moldsim simulation inputs.
 *
 * The dashboard fires the moldsim API (`runFullAnalysis` from
 * `lib/moldsim-api.ts`) with these as inputs on every part change so the
 * cost / cooling / DFM / filling cards reflect *live* API responses rather
 * than hard-coded mock numbers.
 *
 * The dashboard still owns the rich-text fields that the API doesn't
 * generate — issue recommendations, hotspot positions, supplier notes —
 * those stay in `lib/mockMoldAnalysis.ts` because moldsim doesn't have
 * opinions about them.
 */
import type { FullAnalysisRequest } from '@/lib/moldsim-api'
import type { PartId } from '@/lib/types'

export const partSimInputs: Record<PartId, FullAnalysisRequest> = {
  bracket: {
    material: 'ABS',
    wall_thickness: 2.5,
    part_volume: 48,
    part_weight: 50,
    projected_area: 144,
    part_length: 120,
    part_width: 90,
    part_height: 60,
    melt_temp: 240,
    mold_temp: 60,
    production_quantity: 10_000,
    complexity: 'moderate',
    num_cavities: 1,
    num_undercuts: 1,
    min_draft_angle: 1.5,
    has_sharp_corners: false,
    has_uniform_wall: true,
  },
  phoneCase: {
    material: 'ABS',
    wall_thickness: 1.4,
    part_volume: 18,
    part_weight: 19,
    projected_area: 98,
    part_length: 140,
    part_width: 70,
    part_height: 10,
    melt_temp: 240,
    mold_temp: 55,
    production_quantity: 25_000,
    complexity: 'simple',
    num_cavities: 4,
    num_undercuts: 0,
    min_draft_angle: 2.0,
    has_sharp_corners: true, // sharp inside corners — DFM rule trips
    has_uniform_wall: true,
  },
  droneArm: {
    material: 'PA6',
    wall_thickness: 3.2,
    part_volume: 78,
    part_weight: 90,
    projected_area: 56,
    part_length: 180,
    part_width: 38,
    part_height: 26,
    melt_temp: 270,
    mold_temp: 80,
    production_quantity: 5_000,
    complexity: 'complex',
    num_cavities: 1,
    num_undercuts: 2,
    min_draft_angle: 1.0,
    has_sharp_corners: false,
    has_uniform_wall: false, // long span + concentrated mount → non-uniform
  },
  bumper: {
    // Front fascia bumper — large automotive cosmetic part. Realistic
    // production dimensions for a midsize-sedan front fascia:
    //   - 1700 mm (~67") wide: full vehicle width
    //   - 220 mm (~8.7") deep: typical bumper fascia front-to-back
    //   - 380 mm (~15") tall: top-to-bottom span
    // wall_thickness starts at 2.0 mm intentionally — on the thin side
    // for a part this size, which gives the AI assistant something
    // obvious to propose (2.5-3.0 mm to reduce sink-mark risk and
    // improve fillability). Accepting the proposal in the demo visibly
    // bumps the DFM score.
    material: 'PP',
    wall_thickness: 2.0, // demo starts sub-optimal — AI proposes 2.5-3.0
    part_volume: 700, // cm³ — thin shell × bumper bbox at the new depth
    part_weight: 640, // g — PP density × volume
    projected_area: 6460, // cm² — front face L × H (1700 × 380 mm)
    part_length: 1700, // mm — full automotive width
    part_width: 220, // mm — realistic bumper depth (was 450; too deep)
    part_height: 380, // mm — top-to-bottom span
    melt_temp: 230,
    mold_temp: 50,
    production_quantity: 50_000, // automotive volumes
    complexity: 'very_complex',
    num_cavities: 1, // single huge tool
    num_undercuts: 3, // sensor mounts + license plate recess + fog lights
    min_draft_angle: 1.5, // on the low side for a part this size — AI may also propose 2-3°
    has_sharp_corners: false,
    has_uniform_wall: false, // wraparound ends taper, grille area thinner
  },
}
