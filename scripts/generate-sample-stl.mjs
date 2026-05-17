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
  const meshes = []

  // Main body — curved cross-section extruded
  const profile = new THREE.Shape()
  profile.moveTo(-22, -14)
  profile.lineTo(18, -14)
  profile.quadraticCurveTo(22, -14, 22, -10)
  profile.lineTo(22, 10)
  profile.quadraticCurveTo(22, 14, 18, 14)
  profile.lineTo(-15, 14)
  profile.quadraticCurveTo(-22, 14, -22, 10)
  profile.lineTo(-22, -14)
  const body = new THREE.ExtrudeGeometry(profile, {
    depth: 180,
    bevelEnabled: true,
    bevelThickness: 1.2,
    bevelSize: 1.2,
    bevelSegments: 3,
    curveSegments: 12,
  })
  body.translate(0, 0, -90)
  body.rotateY(Math.PI / 2)
  meshes.push(body)

  // Wraparounds
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
  leftWrap.rotateY(Math.PI / 2 + Math.PI / 6)
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

  // Grille
  const grilleBack = new THREE.BoxGeometry(58, 18, 2)
  grilleBack.translate(0, 2, 24)
  meshes.push(grilleBack)
  for (let i = 0; i < 5; i++) {
    const slat = new THREE.BoxGeometry(56, 1.6, 3)
    slat.translate(0, 9 - i * 4, 25.5)
    meshes.push(slat)
  }

  // Fog lights
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

  // Brake-cooling ducts
  for (const x of [-72, 72]) {
    const duct = new THREE.BoxGeometry(18, 3, 2)
    duct.translate(x, -13, 24)
    meshes.push(duct)
  }

  // License-plate recess + light bar
  const plateRecess = new THREE.BoxGeometry(40, 12, 1.5)
  plateRecess.translate(0, -9, 24.5)
  meshes.push(plateRecess)
  const plateLight = new THREE.BoxGeometry(28, 1.5, 1.5)
  plateLight.translate(0, -2.5, 24.5)
  meshes.push(plateLight)

  // Tow-hook cover
  const towCover = new THREE.BoxGeometry(8, 8, 1.5)
  towCover.translate(-22, 2, 24.6)
  meshes.push(towCover)

  // Upper splitter
  const splitter = new THREE.BoxGeometry(150, 2, 4)
  splitter.translate(0, 13, 23.5)
  meshes.push(splitter)

  // Lower air dam + chin splitter
  const airDam = new THREE.BoxGeometry(140, 6, 10)
  airDam.translate(0, -18, 18)
  meshes.push(airDam)
  const chinSplitter = new THREE.BoxGeometry(120, 2, 14)
  chinSplitter.translate(0, -21, 22)
  meshes.push(chinSplitter)

  // Parking sensors on rear face
  for (const x of [-60, -20, 20, 60]) {
    const puck = new THREE.CylinderGeometry(4, 4, 6, 14)
    puck.rotateX(Math.PI / 2)
    puck.translate(x, -2, -22)
    meshes.push(puck)
  }

  return mergeGeometries(meshes)
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
