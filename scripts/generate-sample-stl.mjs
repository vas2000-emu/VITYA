/**
 * One-off generator for public/parts/bracket.stl.
 *
 * Mirrors the bracket geometry in components/viewport/partGeometry.ts so a
 * bundled sample STL matches what users see when they pick the default
 * "Plastic Bracket" part. Run with:
 *
 *   node scripts/generate-sample-stl.mjs
 *
 * Re-run any time the procedural bracket geometry changes.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import * as THREE from 'three'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_PATH = resolve(__dirname, '..', 'public', 'parts', 'bracket.stl')

function buildBracketGeometry() {
  const baseGeom = new THREE.BoxGeometry(120, 12, 90)
  baseGeom.translate(0, -22, 0)

  const wallGeom = new THREE.BoxGeometry(12, 60, 90)
  wallGeom.translate(-54, 2, 0)

  const ribGeom = new THREE.BoxGeometry(30, 30, 12)
  ribGeom.translate(-36, -2, 0)

  const hookGeom = new THREE.BoxGeometry(8, 6, 24)
  hookGeom.translate(-44, 24, 0)

  return mergeGeometries([baseGeom, wallGeom, ribGeom, hookGeom])
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

const geom = buildBracketGeometry()
const mesh = new THREE.Mesh(geom)
const exporter = new STLExporter()
const ascii = exporter.parse(mesh)

await mkdir(dirname(OUT_PATH), { recursive: true })
await writeFile(OUT_PATH, ascii, 'utf8')

const sizeKB = (Buffer.byteLength(ascii, 'utf8') / 1024).toFixed(1)
console.log(`Wrote ${OUT_PATH} (${sizeKB} KB, ${geom.attributes.position.count / 3} triangles)`)
