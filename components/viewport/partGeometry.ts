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

/** L-shaped plastic bracket with two mounting holes through the base. */
function buildBracketGeometry(): THREE.BufferGeometry {
  // Build by merging primitives — keeps the code readable and the result
  // is a single mesh that we can color per-face later.
  const baseGeom = new THREE.BoxGeometry(120, 12, 90)
  baseGeom.translate(0, -22, 0)

  const wallGeom = new THREE.BoxGeometry(12, 60, 90)
  wallGeom.translate(-54, 2, 0)

  const ribGeom = new THREE.BoxGeometry(30, 30, 12)
  ribGeom.translate(-36, -2, 0)

  // The snap-fit hook (intentionally undercut — that's the "issue").
  const hookGeom = new THREE.BoxGeometry(8, 6, 24)
  hookGeom.translate(-44, 24, 0)

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

/** Long thin drone-arm style extrusion with motor mount disc. */
function buildDroneArmGeometry(): THREE.BufferGeometry {
  const arm = new THREE.BoxGeometry(180, 8, 22)
  arm.translate(0, 0, 0)

  const mount = new THREE.CylinderGeometry(18, 18, 8, 24)
  mount.rotateX(Math.PI / 2)
  mount.translate(76, 0, 0)
  mount.rotateZ(Math.PI / 2)

  const motor = new THREE.CylinderGeometry(10, 10, 14, 20)
  motor.translate(76, 11, 0)

  const center = new THREE.BoxGeometry(38, 16, 38)
  center.translate(-76, 0, 0)

  return mergeGeometries([arm, mount, motor, center])
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
