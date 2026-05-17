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
    // Front fascia bumper — large automotive cosmetic part. The biggest
    // part in the library by every dimension, which drives the moldsim
    // numbers (huge tooling, long cycle, high flow ratio).
    material: 'PP',
    wall_thickness: 3.0,
    part_volume: 1200, // cm³
    part_weight: 1100, // g
    projected_area: 6500, // cm²
    part_length: 1700, // mm — full automotive width
    part_width: 450, // mm — bumper depth
    part_height: 380, // mm — top-to-bottom span
    melt_temp: 230,
    mold_temp: 50,
    production_quantity: 50_000, // automotive volumes
    complexity: 'very_complex',
    num_cavities: 1, // single huge tool
    num_undercuts: 3, // sensor mounts + license plate recess + fog lights
    min_draft_angle: 2.0,
    has_sharp_corners: false,
    has_uniform_wall: false, // wraparound ends taper, grille area thinner
  },
}
