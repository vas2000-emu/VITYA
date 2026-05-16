import * as THREE from 'three'

/**
 * Procedural geometry for the three demo parts. Each returns a single
 * BufferGeometry centered on the origin so the camera presets work the
 * same regardless of which part is loaded.
 *
 * Real STEP/STL ingestion lives in components/viewport/Part.tsx — these
 * are only used when no `uploadedSTL` is set in the store.
 */

export type PartId = 'bracket' | 'phoneCase' | 'droneArm'

/** L-shaped plastic bracket with two mounting holes through the base.
 *  Primitives are sized so they butt against each other rather than
 *  overlap — overlapping primitives produce coincident internal faces
 *  that z-fight under shading. */
function buildBracketGeometry(): THREE.BufferGeometry {
  // Base plate: full footprint, 12mm thick, sitting at the bottom.
  const baseGeom = new THREE.BoxGeometry(120, 12, 90)
  baseGeom.translate(0, -22, 0) // base spans y = -28..-16

  // Vertical wall: sits on the LEFT EDGE of the base, growing upward
  // from the base's top face. No overlap with the base interior.
  const wallGeom = new THREE.BoxGeometry(12, 48, 90)
  wallGeom.translate(-54, 8, 0) // wall spans y = -16..32, x = -60..-48

  // Stiffener rib: a triangular-ish prism sitting on top of the base,
  // tucked against the wall. Stops short of the wall's outer face so it
  // doesn't share a plane with the wall.
  const ribGeom = new THREE.BoxGeometry(28, 22, 10)
  ribGeom.translate(-34, -5, 0) // rib spans y = -16..6, x = -48..-20

  // The snap-fit hook (intentionally undercut — that's the "issue"). Sits
  // on TOP of the wall, slightly forward.
  const hookGeom = new THREE.BoxGeometry(8, 6, 22)
  hookGeom.translate(-44, 35, 0) // hook spans y = 32..38

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

const BUILDERS: Record<PartId, () => THREE.BufferGeometry> = {
  bracket: buildBracketGeometry,
  phoneCase: buildPhoneCaseGeometry,
  droneArm: buildDroneArmGeometry,
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
