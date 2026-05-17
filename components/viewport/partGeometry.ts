import * as THREE from 'three'

/**
 * Procedural geometry for the four demo parts. Each builder accepts a
 * GeometryParams shape so live parameter edits (wall thickness, height,
 * draft angle) rebuild the mesh in-place.
 *
 * Real STEP/STL ingestion lives in components/viewport/Part.tsx — these
 * are only used when no `uploadedSTL` is set in the store.
 */

import { Brush, Evaluator, ADDITION, SUBTRACTION, INTERSECTION } from 'three-bvh-csg'
import type { CsgNode, CustomPartShape, DemoPartId } from '@/lib/types'

export type PartId = DemoPartId | 'custom' | (string & {})

/** Live geometry inputs. Defaults reflect the bumper hero baseline so
 *  loading without params yields the same look as before this change.
 *  All three axis scales are multipliers against the procedural
 *  geometry's natural authoring dimensions (1 = baseline). The
 *  user-facing Parameters panel computes these from the current
 *  simulationParams.part{Length,Width,Height} divided by the current
 *  part's baseline dimensions in partSimInputs. */
export interface GeometryParams {
  /** Length scale (world X). Driven by p-len. */
  lengthScale: number
  /** Height scale (world Y). Driven by p-height. */
  heightScale: number
  /** Width / depth scale (world Z). Driven by p-wid. */
  widthScale: number
  /** Wall/shell thickness in mm. Currently only meaningfully affects
   *  the phone case shell and the bracket footprint. */
  wallThickness: number
  /** Draft angle in degrees applied as a positive Y-axis taper on
   *  vertical walls of the procedural meshes. */
  draftDeg: number
}

export const DEFAULT_GEOMETRY_PARAMS: GeometryParams = {
  lengthScale: 1,
  heightScale: 1,
  widthScale: 1,
  wallThickness: 2.5,
  draftDeg: 2,
}

/** L-shaped plastic bracket. Primitives have 2-unit overlaps along the
 *  shared faces so there's no visible gap from anti-aliasing — without
 *  the overlap the rib/hook can read as floating just off the body. */
function buildBracketGeometry(): THREE.BufferGeometry {
  // Base plate: full footprint, 12mm thick, sitting at the bottom.
  const baseGeom = new THREE.BoxGeometry(120, 12, 90)
  baseGeom.translate(0, -22, 0) // base spans y = -28..-16

  // Vertical wall: sits on the left edge of the base, overlapping the
  // base top by 2 units so the junction reads as solid.
  const wallGeom = new THREE.BoxGeometry(12, 50, 90)
  wallGeom.translate(-54, 7, 0) // wall spans y = -18..32

  // Stiffener rib: tucked between the base top and the wall's right
  // face. 2-unit overlap into the wall (x = -50 vs wall right edge -48).
  const ribGeom = new THREE.BoxGeometry(34, 24, 14)
  ribGeom.translate(-33, -6, 0) // rib spans y = -18..6, x = -50..-16

  // Snap-fit hook protruding from the right side of the wall. Overlaps
  // 2 units INTO the wall on the x axis (hook left edge x=-49 vs wall
  // right edge x=-48) so it reads as joined, not floating.
  const hookGeom = new THREE.BoxGeometry(10, 8, 22)
  hookGeom.translate(-44, 26, 0) // hook spans y = 22..30, x = -49..-39

  return mergeGeometries([baseGeom, wallGeom, ribGeom, hookGeom])
}

/** Thin rounded phone-case-style shell. */
function buildPhoneCaseGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape()
  const w = 70
  const h = 140
  const r = 10
  shape.moveTo(-w / 2 + r, -h / 2)
  shape.lineTo(w / 2 - r, -h / 2)
  shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r)
  shape.lineTo(w / 2, h / 2 - r)
  shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2)
  shape.lineTo(-w / 2 + r, h / 2)
  shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r)
  shape.lineTo(-w / 2, -h / 2 + r)
  shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2)

  // Hollow out the inner cavity (where the phone sits).
  const inner = new THREE.Path()
  const iw = w - 8
  const ih = h - 12
  const ir = r - 2
  inner.moveTo(-iw / 2 + ir, -ih / 2)
  inner.lineTo(iw / 2 - ir, -ih / 2)
  inner.quadraticCurveTo(iw / 2, -ih / 2, iw / 2, -ih / 2 + ir)
  inner.lineTo(iw / 2, ih / 2 - ir)
  inner.quadraticCurveTo(iw / 2, ih / 2, iw / 2 - ir, ih / 2)
  inner.lineTo(-iw / 2 + ir, ih / 2)
  inner.quadraticCurveTo(-iw / 2, ih / 2, -iw / 2, ih / 2 - ir)
  inner.lineTo(-iw / 2, -ih / 2 + ir)
  inner.quadraticCurveTo(-iw / 2, -ih / 2, -iw / 2 + ir, -ih / 2)
  shape.holes.push(inner)

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: 8,
    bevelEnabled: true,
    bevelThickness: 0.6,
    bevelSize: 0.6,
    bevelSegments: 2,
    curveSegments: 8,
  })
  geom.center()
  geom.rotateX(-Math.PI / 2)
  return geom
}

/** Long thin drone-arm style extrusion with motor mount disc.
 *  Primitives are positioned so they share at most an edge, not a
 *  volume — avoids z-fighting on the merged mesh. */
function buildDroneArmGeometry(): THREE.BufferGeometry {
  // Central body block at the inboard end of the arm.
  const center = new THREE.BoxGeometry(38, 16, 38)
  center.translate(-76, 0, 0) // center spans x = -95..-57

  // The arm itself: starts at the right edge of the center block.
  const arm = new THREE.BoxGeometry(135, 8, 22)
  arm.translate(10, 0, 0) // arm spans x = -57..78

  // Motor mount disc at the outboard end. Slight gap from arm so the
  // disc face doesn't share a plane with the arm's end face.
  const mount = new THREE.CylinderGeometry(18, 18, 8, 24)
  mount.rotateX(Math.PI / 2)
  mount.rotateZ(Math.PI / 2)
  mount.translate(82, 0, 0)

  // Motor stub on top of the mount.
  const motor = new THREE.CylinderGeometry(10, 10, 14, 20)
  motor.translate(82, 11, 0)

  return mergeGeometries([center, arm, mount, motor])
}

/**
 * Realistic automotive front bumper fascia — the DEMO HERO part.
 *
 * Visual feature inventory (each ties to a marked-up issue):
 *   • Curved-cross-section main beam (ExtrudeGeometry along extruded
 *     length — convex top, vertical front, soft bottom curve)
 *   • Two wraparound ends angled back toward the wheel wells
 *   • Central grille opening (recessed) with horizontal slats
 *   • Two fog-light bezels (recessed pockets, rim ring)
 *   • Upper splitter / hood-line lip
 *   • Lower air dam with chin splitter
 *   • License plate recess (upper center) + small light bar above it
 *   • Tow-hook cover (small flap on left of grille)
 *   • Four parking-sensor pucks on the rear face (undercuts)
 *   • Brake-cooling ducts under the fog lights
 */
function buildBumperGeometry(): THREE.BufferGeometry {
  const meshes: THREE.BufferGeometry[] = []

  // ── MAIN BODY: curved cross-section extruded along length ──────────
  // Cross-section drawn in XY of a Shape; we extrude along Z then
  // rotate so the extrusion direction becomes the world X axis.
  const profile = new THREE.Shape()
  // Walking the cross-section clockwise starting at back-bottom:
  profile.moveTo(-22, -14)          // back-bottom
  profile.lineTo(18, -14)           // bottom-front
  profile.quadraticCurveTo(22, -14, 22, -10) // round bottom-front corner
  profile.lineTo(22, 10)            // up the front face
  profile.quadraticCurveTo(22, 14, 18, 14)   // round top-front corner
  profile.lineTo(-15, 14)           // across the top
  profile.quadraticCurveTo(-22, 14, -22, 10) // round top-back corner
  profile.lineTo(-22, -14)          // back to start

  const body = new THREE.ExtrudeGeometry(profile, {
    depth: 180,
    bevelEnabled: true,
    bevelThickness: 1.2,
    bevelSize: 1.2,
    bevelSegments: 3,
    curveSegments: 12,
  })
  // Center along extrusion + rotate so length is along world X
  body.translate(0, 0, -90)
  body.rotateY(Math.PI / 2)
  // Now body extends roughly x = -90..90, y = -16..16, z = -23..23
  meshes.push(body)

  // ── WRAPAROUND ENDS — angled boxes meeting the body's outer faces ──
  const wrapShape = new THREE.Shape()
  wrapShape.moveTo(-18, -14)
  wrapShape.lineTo(14, -14)
  wrapShape.quadraticCurveTo(18, -14, 18, -10)
  wrapShape.lineTo(18, 10)
  wrapShape.quadraticCurveTo(18, 14, 14, 14)
  wrapShape.lineTo(-18, 14)
  wrapShape.lineTo(-18, -14)

  const leftWrap = new THREE.ExtrudeGeometry(wrapShape, {
    depth: 30,
    bevelEnabled: true,
    bevelThickness: 1,
    bevelSize: 1,
    bevelSegments: 2,
    curveSegments: 8,
  })
  leftWrap.translate(0, 0, -15)
  leftWrap.rotateY(Math.PI / 2 + Math.PI / 6) // ~30° wrap angle
  leftWrap.translate(-95, 0, -3)
  meshes.push(leftWrap)

  const rightWrap = new THREE.ExtrudeGeometry(wrapShape, {
    depth: 30,
    bevelEnabled: true,
    bevelThickness: 1,
    bevelSize: 1,
    bevelSegments: 2,
    curveSegments: 8,
  })
  rightWrap.translate(0, 0, -15)
  rightWrap.rotateY(Math.PI / 2 - Math.PI / 6)
  rightWrap.translate(95, 0, -3)
  meshes.push(rightWrap)

  // ── GRILLE OPENING — central recessed dark panel + horizontal slats ─
  // Backing plate (dark recess effect). Sits just FORWARD of the body
  // front face (z=23) so it reads as protruding-then-recessed.
  const grilleBack = new THREE.BoxGeometry(58, 18, 2)
  grilleBack.translate(0, 2, 24)
  meshes.push(grilleBack)
  // Five horizontal slats spanning the grille
  for (let i = 0; i < 5; i++) {
    const slat = new THREE.BoxGeometry(56, 1.6, 3)
    slat.translate(0, 9 - i * 4, 25.5)
    meshes.push(slat)
  }

  // ── FOG-LIGHT BEZELS — cylindrical pockets in lower bumper corners ─
  // Each fog light: outer ring (rim) + inner darker disc.
  for (const x of [-72, 72]) {
    const rim = new THREE.CylinderGeometry(8, 8, 2, 24)
    rim.rotateX(Math.PI / 2)
    rim.translate(x, -6, 24)
    meshes.push(rim)
    const inner = new THREE.CylinderGeometry(5, 5, 2.5, 20)
    inner.rotateX(Math.PI / 2)
    inner.translate(x, -6, 24.4)
    meshes.push(inner)
  }

  // ── BRAKE-COOLING DUCTS — slim horizontal slots below fog lights ───
  for (const x of [-72, 72]) {
    const duct = new THREE.BoxGeometry(18, 3, 2)
    duct.translate(x, -13, 24)
    meshes.push(duct)
  }

  // ── LICENSE-PLATE RECESS + light bar above ─────────────────────────
  const plateRecess = new THREE.BoxGeometry(40, 12, 1.5)
  plateRecess.translate(0, -9, 24.5)
  meshes.push(plateRecess)
  const plateLight = new THREE.BoxGeometry(28, 1.5, 1.5)
  plateLight.translate(0, -2.5, 24.5)
  meshes.push(plateLight)

  // ── TOW-HOOK COVER — small offset flap near grille left ────────────
  const towCover = new THREE.BoxGeometry(8, 8, 1.5)
  towCover.translate(-22, 2, 24.6)
  meshes.push(towCover)

  // ── UPPER SPLITTER / HOOD-LINE LIP — thin chrome-like strip ────────
  const splitter = new THREE.BoxGeometry(150, 2, 4)
  splitter.translate(0, 13, 23.5)
  meshes.push(splitter)

  // ── LOWER AIR DAM + CHIN SPLITTER ──────────────────────────────────
  const airDam = new THREE.BoxGeometry(140, 6, 10)
  airDam.translate(0, -18, 18)
  meshes.push(airDam)
  const chinSplitter = new THREE.BoxGeometry(120, 2, 14)
  chinSplitter.translate(0, -21, 22)
  meshes.push(chinSplitter)

  // ── PARKING SENSORS — four pucks on the rear face (UNDERCUTS) ──────
  const sensorPositions = [-60, -20, 20, 60]
  for (const x of sensorPositions) {
    const puck = new THREE.CylinderGeometry(4, 4, 6, 14)
    puck.rotateX(Math.PI / 2)
    puck.translate(x, -2, -22) // back face at z=-23, puck overlaps 1 unit
    meshes.push(puck)
  }

  return mergeGeometries(meshes)
}

// ────────────────────────────────────────────────────────────────────
// Parameterized primitives for AI-generated parts (Track B). Each
// builder produces a centered geometry whose bounding box matches the
// requested L × H × W exactly, so the per-axis scaling in applyParams
// stays at 1× when the panel matches the spec. shape="shell" hollows
// out the top so the wall thickness is visible; the other shapes
// render as solids.
// ────────────────────────────────────────────────────────────────────

function buildCustomBoxGeometry(
  length: number,
  height: number,
  width: number,
): THREE.BufferGeometry {
  return new THREE.BoxGeometry(length, height, width, 1, 1, 1)
}

function buildCustomCylinderGeometry(
  length: number,
  height: number,
  width: number,
): THREE.BufferGeometry {
  // Length / width treated as diameters of an ellipse cross-section
  // (radial scale applied after building a unit cylinder so a
  // length != width yields an oval). Height runs along world Y.
  const baseRadius = 0.5
  const geom = new THREE.CylinderGeometry(baseRadius, baseRadius, height, 48, 1, false)
  geom.scale(length, 1, width)
  return geom
}

function buildCustomPlateGeometry(
  length: number,
  height: number,
  width: number,
): THREE.BufferGeometry {
  // "Plate" = a thin box where height (Y) is small relative to L/W.
  // We don't enforce that here; the AI prompt + tool description
  // do — we just build a box of the requested dimensions.
  return new THREE.BoxGeometry(length, height, width, 1, 1, 1)
}

function buildCustomShellGeometry(
  length: number,
  height: number,
  width: number,
  wallThickness: number,
): THREE.BufferGeometry {
  // Hollow rounded shell with an open top (phone-case / cup style).
  // Footprint is a rounded rectangle (L × W), extruded up by height,
  // hollowed by wallThickness on each side.
  const r = Math.min(length, width) * 0.08
  const outerHalfL = length / 2
  const outerHalfW = width / 2
  const outerShape = roundedShape(outerHalfL, outerHalfW, r)

  const innerHalfL = Math.max(0.1, outerHalfL - wallThickness)
  const innerHalfW = Math.max(0.1, outerHalfW - wallThickness)
  const innerR = Math.max(0.1, r - wallThickness)
  outerShape.holes.push(roundedPath(innerHalfL, innerHalfW, innerR))

  const geom = new THREE.ExtrudeGeometry(outerShape, {
    depth: height,
    bevelEnabled: false,
    curveSegments: 12,
  })
  // ExtrudeGeometry extrudes along +Z by default; rotate so the open
  // top faces +Y, then re-center so the bbox is symmetric on Y.
  geom.rotateX(-Math.PI / 2)
  geom.translate(0, -height / 2, 0)
  return geom
}

function traceRoundedRect(
  curve: THREE.Shape | THREE.Path,
  halfL: number,
  halfW: number,
  r: number,
) {
  curve.moveTo(-halfL + r, -halfW)
  curve.lineTo(halfL - r, -halfW)
  curve.quadraticCurveTo(halfL, -halfW, halfL, -halfW + r)
  curve.lineTo(halfL, halfW - r)
  curve.quadraticCurveTo(halfL, halfW, halfL - r, halfW)
  curve.lineTo(-halfL + r, halfW)
  curve.quadraticCurveTo(-halfL, halfW, -halfL, halfW - r)
  curve.lineTo(-halfL, -halfW + r)
  curve.quadraticCurveTo(-halfL, -halfW, -halfL + r, -halfW)
}

function roundedShape(halfL: number, halfW: number, r: number): THREE.Shape {
  const shape = new THREE.Shape()
  traceRoundedRect(shape, halfL, halfW, r)
  return shape
}

function roundedPath(halfL: number, halfW: number, r: number): THREE.Path {
  const path = new THREE.Path()
  traceRoundedRect(path, halfL, halfW, r)
  return path
}

/** Donut. length/width are the major-diameter X/Z axes; height controls
 *  the tube diameter. */
function buildCustomTorusGeometry(
  length: number,
  height: number,
  width: number,
): THREE.BufferGeometry {
  // majorR + tubeR = 0.5 (unit outer radius before X/Z scale).
  // tubeR = 0.2 → inner hole = 2*(majorR-tubeR) = 0.6 of outer diameter (~40% hole).
  // Scale X/Z to fit the declared bbox; Y is scaled so the tube fills `height`.
  const tubeR = 0.2
  const majorR = 0.5
  const outerD = 2 * (majorR + tubeR) // 1.4 before scale
  const tubeD = 2 * tubeR             // 0.4 before scale
  const geom = new THREE.TorusGeometry(majorR, tubeR, 24, 64)
  geom.rotateX(Math.PI / 2)
  geom.scale(length / outerD, height / tubeD, width / outerD)
  return geom
}

function buildCustomConeGeometry(
  length: number,
  height: number,
  width: number,
): THREE.BufferGeometry {
  const baseRadius = 0.5
  const geom = new THREE.ConeGeometry(baseRadius, height, 48, 1, false)
  geom.scale(length, 1, width)
  return geom
}

function buildCustomSphereGeometry(
  length: number,
  height: number,
  width: number,
): THREE.BufferGeometry {
  const geom = new THREE.SphereGeometry(0.5, 32, 24)
  geom.scale(length, height, width)
  return geom
}

function buildCustomDomeGeometry(
  length: number,
  height: number,
  width: number,
): THREE.BufferGeometry {
  // Hemisphere — open bottom.
  const geom = new THREE.SphereGeometry(0.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2)
  geom.scale(length, height * 2, width)
  geom.translate(0, -height / 2, 0)
  return geom
}

function buildCustomHexPrismGeometry(
  length: number,
  height: number,
  width: number,
): THREE.BufferGeometry {
  // 6-sided prism (hexagonal cross-section) extruded along Y.
  // CylinderGeometry with 6 radialSegments gives us a hex.
  const baseRadius = 0.5
  const geom = new THREE.CylinderGeometry(baseRadius, baseRadius, height, 6, 1, false)
  geom.scale(length, 1, width)
  return geom
}

function buildCustomRingGeometry(
  length: number,
  height: number,
  width: number,
): THREE.BufferGeometry {
  // Hollow flat ring (washer-style). Outer radius = 0.5, hole = 0.3.
  // height controls the ring's thickness along Y.
  const outerR = 0.5
  const innerR = 0.3
  const geom = new THREE.CylinderGeometry(outerR, outerR, height, 48, 1, false)
  // Use CSG to punch the inner hole so applyParams doesn't double-scale
  // a ring of holes. Build the punch as a slightly-taller inner cylinder.
  const inner = new THREE.CylinderGeometry(innerR, innerR, height * 1.05, 48, 1, false)
  const out = new Brush(geom)
  const cut = new Brush(inner)
  const ev = new Evaluator()
  const result = ev.evaluate(out, cut, SUBTRACTION)
  const ringGeom = result.geometry
  ringGeom.scale(length, 1, width)
  return ringGeom
}

/** Dispatch to the right parameterized primitive. Returns a centered
 *  geometry whose bbox is exactly L × H × W; applyParams in the caller
 *  applies draft + per-axis scaling on top. */
export function buildCustomGeometry(
  shape: CustomPartShape,
  length: number,
  height: number,
  width: number,
  wallThickness: number,
): THREE.BufferGeometry {
  switch (shape) {
    case 'box':
      return buildCustomBoxGeometry(length, height, width)
    case 'cylinder':
      return buildCustomCylinderGeometry(length, height, width)
    case 'plate':
      return buildCustomPlateGeometry(length, height, width)
    case 'shell':
      return buildCustomShellGeometry(length, height, width, wallThickness)
    case 'torus':
      return buildCustomTorusGeometry(length, height, width)
    case 'cone':
      return buildCustomConeGeometry(length, height, width)
    case 'sphere':
      return buildCustomSphereGeometry(length, height, width)
    case 'dome':
      return buildCustomDomeGeometry(length, height, width)
    case 'hex_prism':
      return buildCustomHexPrismGeometry(length, height, width)
    case 'ring':
      return buildCustomRingGeometry(length, height, width)
  }
}

// ────────────────────────────────────────────────────────────────────
// CSG — constructive solid geometry. The AI can compose primitives via
// union / subtract / intersect ops in a tree (CsgNode). Each leaf is a
// primitive built via buildCustomGeometry, then translated; each
// operation feeds two children into three-bvh-csg's Evaluator.
// ────────────────────────────────────────────────────────────────────

const csgEvaluator = new Evaluator()
csgEvaluator.useGroups = false

const CSG_OPS = {
  union: ADDITION,
  subtract: SUBTRACTION,
  intersect: INTERSECTION,
} as const

function evaluateCsgNode(node: CsgNode): THREE.BufferGeometry {
  if (node.kind === 'primitive') {
    const geom = buildCustomGeometry(
      node.shape,
      node.length,
      node.height,
      node.width,
      node.wallThickness ?? 2,
    )
    if (node.translate) {
      geom.translate(node.translate.x ?? 0, node.translate.y ?? 0, node.translate.z ?? 0)
    }
    return geom
  }
  const geomA = evaluateCsgNode(node.a)
  const geomB = evaluateCsgNode(node.b)
  const a = new Brush(geomA)
  const b = new Brush(geomB)
  a.updateMatrixWorld()
  b.updateMatrixWorld()
  const result = csgEvaluator.evaluate(a, b, CSG_OPS[node.op])
  const out = result.geometry.clone()
  geomA.dispose()
  geomB.dispose()
  result.geometry.dispose()
  return out
}

export function buildCsgGeometry(root: CsgNode): THREE.BufferGeometry {
  const geom = evaluateCsgNode(root)
  geom.computeVertexNormals()
  geom.computeBoundingBox()
  return geom
}

// Placeholder builder so the BUILDERS table type-checks; the actual
// custom geometry is produced via buildCustomGeometry() at render time
// because it needs the CustomPartSpec from the store.
function buildCustomFallbackGeometry(): THREE.BufferGeometry {
  return buildCustomBoxGeometry(100, 50, 80)
}

// Demo-part builders only; custom parts go through buildCustomGeometry.
const BUILDERS: Record<DemoPartId, () => THREE.BufferGeometry> = {
  bracket: buildBracketGeometry,
  phoneCase: buildPhoneCaseGeometry,
  droneArm: buildDroneArmGeometry,
  bumper: buildBumperGeometry,
}

// Cache only the un-parameterized baseline. Parameter-driven variants
// are derived on the fly so changing a slider yields a fresh geometry.
const cache = new Map<DemoPartId, THREE.BufferGeometry>()

function getBaseGeometry(id: PartId): THREE.BufferGeometry {
  const demoId = id as DemoPartId
  if (!(demoId in BUILDERS)) return buildCustomFallbackGeometry()
  let geom = cache.get(demoId)
  if (!geom) {
    geom = BUILDERS[demoId]()
    geom.computeVertexNormals()
    geom.computeBoundingBox()
    cache.set(demoId, geom)
  }
  return geom
}

/**
 * Apply parameter-driven deformations to the baseline geometry.
 *
 *  - lengthScale / heightScale / widthScale stretch the part along
 *    world X / Y / Z respectively. These are multipliers against the
 *    procedural geometry's natural authoring dimensions so that
 *    editing partLength / partHeight / partWidth in the panel
 *    visibly resizes the part proportionally.
 *  - draftDeg tapers walls so vertices above y=0 are pulled inward
 *    proportional to (y * tan(draft)). This approximates a real CAD
 *    draft angle and works for any baseline shape.
 *  - wallThickness has no visible effect for solid demo parts; the
 *    phone case uses it via a separate path (rebuilt from primitives).
 *
 * Scaling is applied BEFORE the draft taper so the draft works in the
 * post-scale frame (otherwise a tall stretched part would taper too
 * aggressively relative to its visible height).
 *
 * Returns a new BufferGeometry — the baseline cache stays untouched.
 */
function applyParams(base: THREE.BufferGeometry, params: GeometryParams): THREE.BufferGeometry {
  const geom = base.clone()
  const pos = geom.getAttribute('position') as THREE.BufferAttribute
  const arr = pos.array as Float32Array

  base.computeBoundingBox()
  const box = base.boundingBox!
  // halfY of the SCALED geometry, used for the draft taper math.
  const halfY = Math.max(0.001, ((box.max.y - box.min.y) / 2) * params.heightScale)
  const draftRad = (params.draftDeg * Math.PI) / 180
  // tan(draft) * halfY = inward offset at the very top. Visual gain is
  // amplified (no dampening) so the demo's draft proposal — going from
  // 1.5° to ~3° — produces a noticeable taper change on accept.
  const taperPerY = Math.tan(draftRad)

  for (let i = 0; i < arr.length; i += 3) {
    const x = arr[i] * params.lengthScale
    const y = arr[i + 1] * params.heightScale
    const z = arr[i + 2] * params.widthScale
    // Inward taper grows with distance above the centerline. Negative-Y
    // verts (underside) are left alone so the bottom face stays flat.
    const inwardFactor = y > 0 ? 1 - (y * taperPerY) / halfY : 1
    arr[i] = x * inwardFactor
    arr[i + 1] = y
    arr[i + 2] = z * inwardFactor
  }
  pos.needsUpdate = true
  geom.computeVertexNormals()
  geom.computeBoundingBox()
  return geom
}

export function getPartGeometry(id: PartId, params?: GeometryParams): THREE.BufferGeometry {
  const base = getBaseGeometry(id)
  if (!params) return base
  return applyParams(base, params)
}

/**
 * Minimal mergeGeometries — three-stdlib has one but pulling it in here
 * keeps the dependency surface obvious.
 */
function mergeGeometries(geoms: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const positions: number[] = []
  const normals: number[] = []
  for (const g of geoms) {
    const nonIndexed = g.index ? g.toNonIndexed() : g
    const posAttr = nonIndexed.getAttribute('position') as THREE.BufferAttribute
    const normAttr = nonIndexed.getAttribute('normal') as THREE.BufferAttribute | undefined
    for (let i = 0; i < posAttr.count; i++) {
      positions.push(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i))
      if (normAttr) {
        normals.push(normAttr.getX(i), normAttr.getY(i), normAttr.getZ(i))
      }
    }
  }
  const merged = new THREE.BufferGeometry()
  merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  if (normals.length === positions.length) {
    merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  } else {
    merged.computeVertexNormals()
  }
  return merged
}
