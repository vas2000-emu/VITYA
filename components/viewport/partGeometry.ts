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

/** Automotive front bumper fascia. Long horizontal beam, two
 *  wraparound ends, lower lip, two fog-light bezel pockets, and a pair
 *  of sensor-mount bosses on the BACK face that drive the "undercut"
 *  issue in the mock data. All sub-features overlap the beam by ≥1
 *  unit on shared axes — no coincident faces to z-fight. */
function buildBumperGeometry(): THREE.BufferGeometry {
  // Main horizontal beam. z spans -8..8.
  const beam = new THREE.BoxGeometry(180, 30, 16)
  beam.translate(0, 5, 0)

  // Top lip that catches air. Sits flush ON TOP of the beam (y overlap)
  // and PROTRUDES forward of the beam's +z face — its back face is at
  // z=7, 1 unit INSIDE the beam, so no coincident-face fight.
  const topLip = new THREE.BoxGeometry(160, 8, 6)
  topLip.translate(0, 22, 10) // y = 18..26 (overlap beam top), z = 7..13

  // Lower air-dam spoiler — hangs below beam, slight forward bias.
  const lowerLip = new THREE.BoxGeometry(150, 10, 8)
  lowerLip.translate(0, -13, 6) // y = -18..-8 (overlap beam bottom), z = 2..10

  // Left wraparound end — angled box rotated to taper back toward the
  // body. Positioned just past the beam's left edge, with 2-unit
  // overlap on x so the joint reads as solid.
  const leftWrap = new THREE.BoxGeometry(28, 28, 14)
  leftWrap.rotateY(-Math.PI / 6)
  leftWrap.translate(-98, 5, -4)

  const rightWrap = new THREE.BoxGeometry(28, 28, 14)
  rightWrap.rotateY(Math.PI / 6)
  rightWrap.translate(98, 5, -4)

  // Fog-light bezels — protrude from the front face. Back face at z=9
  // is 1 unit forward of beam's +z face (z=8), so no coincidence.
  const fogLeft = new THREE.BoxGeometry(20, 16, 5)
  fogLeft.translate(-78, -2, 11) // z = 8.5..13.5 (back face 0.5 unit forward of beam)
  const fogRight = new THREE.BoxGeometry(20, 16, 5)
  fogRight.translate(78, -2, 11)

  // Central grille — protrudes slightly. Back face at z=9 forward of
  // beam's +z=8 face.
  const grille = new THREE.BoxGeometry(64, 20, 4)
  grille.translate(0, 2, 11) // z = 9..13

  // Sensor-mount bosses on the BACK face (z<0). 1-unit overlap into the
  // beam's -z face for a clean joint.
  const sensorR = new THREE.CylinderGeometry(7, 7, 8, 16)
  sensorR.rotateX(Math.PI / 2)
  sensorR.translate(78, -2, -11) // z = -15..-7 (1-unit overlap into beam back face z=-8)
  const sensorL = new THREE.CylinderGeometry(7, 7, 8, 16)
  sensorL.rotateX(Math.PI / 2)
  sensorL.translate(-78, -2, -11)

  return mergeGeometries([
    beam,
    topLip,
    lowerLip,
    leftWrap,
    rightWrap,
    fogLeft,
    fogRight,
    grille,
    sensorL,
    sensorR,
  ])
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
