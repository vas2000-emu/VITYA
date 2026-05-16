import * as THREE from 'three'

/**
 * Procedural geometry for the three demo parts. Each returns a single
 * BufferGeometry centered on the origin so the camera presets work the
 * same regardless of which part is loaded.
 *
 * Real STEP/STL ingestion lives in components/viewport/Part.tsx — these
 * are only used when no `uploadedSTL` is set in the store.
 */

export type PartId = 'bracket' | 'phoneCase' | 'droneArm' | 'bumper'

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

const BUILDERS: Record<PartId, () => THREE.BufferGeometry> = {
  bracket: buildBracketGeometry,
  phoneCase: buildPhoneCaseGeometry,
  droneArm: buildDroneArmGeometry,
  bumper: buildBumperGeometry,
}

const cache = new Map<PartId, THREE.BufferGeometry>()

export function getPartGeometry(id: PartId): THREE.BufferGeometry {
  let geom = cache.get(id)
  if (!geom) {
    geom = BUILDERS[id]()
    geom.computeVertexNormals()
    geom.computeBoundingBox()
    cache.set(id, geom)
  }
  return geom
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
