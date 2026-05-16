/**
 * Generator for the bundled sample STLs in public/parts/.
 *
 * Mirrors the procedural geometry in components/viewport/partGeometry.ts
 * so every sample STL matches what users see when they pick a part in
 * the dashboard. Run with:
 *
 *   node scripts/generate-sample-stl.mjs
 *
 * Re-run any time the procedural geometry for a sample part changes.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import * as THREE from 'three'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(__dirname, '..', 'public', 'parts')

// ────────────────────────────────────────────────────────────
// Geometry builders (mirror components/viewport/partGeometry.ts)
// ────────────────────────────────────────────────────────────

function buildBracketGeometry() {
  const baseGeom = new THREE.BoxGeometry(120, 12, 90)
  baseGeom.translate(0, -22, 0)

  const wallGeom = new THREE.BoxGeometry(12, 50, 90)
  wallGeom.translate(-54, 7, 0)

  const ribGeom = new THREE.BoxGeometry(34, 24, 14)
  ribGeom.translate(-33, -6, 0)

  const hookGeom = new THREE.BoxGeometry(10, 8, 22)
  hookGeom.translate(-44, 26, 0)

  return mergeGeometries([baseGeom, wallGeom, ribGeom, hookGeom])
}

function buildPhoneCaseGeometry() {
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

function buildDroneArmGeometry() {
  const center = new THREE.BoxGeometry(38, 16, 38)
  center.translate(-76, 0, 0)

  const arm = new THREE.BoxGeometry(135, 8, 22)
  arm.translate(10, 0, 0)

  const mount = new THREE.CylinderGeometry(18, 18, 8, 24)
  mount.rotateX(Math.PI / 2)
  mount.rotateZ(Math.PI / 2)
  mount.translate(82, 0, 0)

  const motor = new THREE.CylinderGeometry(10, 10, 14, 20)
  motor.translate(82, 11, 0)

  return mergeGeometries([center, arm, mount, motor])
}

function buildBumperGeometry() {
  const beam = new THREE.BoxGeometry(180, 30, 16)
  beam.translate(0, 5, 0)

  const topLip = new THREE.BoxGeometry(160, 8, 6)
  topLip.translate(0, 22, 10)

  const lowerLip = new THREE.BoxGeometry(150, 10, 8)
  lowerLip.translate(0, -13, 6)

  const leftWrap = new THREE.BoxGeometry(28, 28, 14)
  leftWrap.rotateY(-Math.PI / 6)
  leftWrap.translate(-98, 5, -4)

  const rightWrap = new THREE.BoxGeometry(28, 28, 14)
  rightWrap.rotateY(Math.PI / 6)
  rightWrap.translate(98, 5, -4)

  const fogLeft = new THREE.BoxGeometry(20, 16, 5)
  fogLeft.translate(-78, -2, 11)
  const fogRight = new THREE.BoxGeometry(20, 16, 5)
  fogRight.translate(78, -2, 11)

  const grille = new THREE.BoxGeometry(64, 20, 4)
  grille.translate(0, 2, 11)

  const sensorR = new THREE.CylinderGeometry(7, 7, 8, 16)
  sensorR.rotateX(Math.PI / 2)
  sensorR.translate(78, -2, -11)
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

function mergeGeometries(geoms) {
  const positions = []
  const normals = []
  for (const g of geoms) {
    const ng = g.index ? g.toNonIndexed() : g
    const pos = ng.getAttribute('position')
    const nor = ng.getAttribute('normal')
    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i))
      if (nor) normals.push(nor.getX(i), nor.getY(i), nor.getZ(i))
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

// ────────────────────────────────────────────────────────────
// Export each part to its own STL
// ────────────────────────────────────────────────────────────

const PARTS = [
  { name: 'bracket', build: buildBracketGeometry },
  { name: 'phone_case', build: buildPhoneCaseGeometry },
  { name: 'drone_arm', build: buildDroneArmGeometry },
  { name: 'bumper', build: buildBumperGeometry },
]

await mkdir(OUT_DIR, { recursive: true })
const exporter = new STLExporter()

for (const { name, build } of PARTS) {
  const geom = build()
  const mesh = new THREE.Mesh(geom)
  const ascii = exporter.parse(mesh)
  const outPath = resolve(OUT_DIR, `${name}.stl`)
  await writeFile(outPath, ascii, 'utf8')
  const sizeKB = (Buffer.byteLength(ascii, 'utf8') / 1024).toFixed(1)
  console.log(
    `Wrote ${outPath} (${sizeKB} KB, ${geom.attributes.position.count / 3} triangles)`,
  )
}
