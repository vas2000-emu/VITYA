'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { STLLoader } from 'three-stdlib'
import { useFrame } from '@react-three/fiber'
import { useAppStore } from '@/store/useAppStore'
import { useResultsStore } from '@/store/useResultsStore'
import { partsLibrary } from '@/lib/mockMoldAnalysis'
import { getPartGeometry, type PartId } from './partGeometry'
import type { MoldIssue, MoldIssueSeverity } from '@/lib/types'

const SEVERITY_HEX: Record<MoldIssueSeverity, string> = {
  high: '#ef4444', // rose-500
  medium: '#f59e0b', // amber-500
  low: '#10b981', // emerald-500
}

const FIXED_HEX = '#10b981' // emerald-500
const BASE_HI = new THREE.Color('#7dd3fc') // sky-300 top
const BASE_LO = new THREE.Color('#1e3a8a') // navy bottom

/**
 * Renders either the user-uploaded STL (Blob URL from
 * useAppStore.uploadedSTL) or the procedural geometry for the current
 * partId. Bakes vertex colors for the DFM heatmap, with pulse animation
 * on the issue currently being applied.
 */
export function Part() {
  const uploadedSTL = useAppStore((s) => s.uploadedSTL)
  const currentPartId = useAppStore((s) => s.currentPartId) as PartId
  const heatmapEnabled = useAppStore((s) => s.viewportHeatmap)
  const showManufacturing = useAppStore((s) => s.showManufacturing)

  const fixedIssueIds = useResultsStore((s) => s.fixedIssueIds)
  const pendingFixId = useResultsStore((s) => s.pendingFixId)

  const proceduralGeom = useMemo(() => getPartGeometry(currentPartId), [currentPartId])
  const [uploadedGeom, setUploadedGeom] = useState<THREE.BufferGeometry | null>(null)
  const meshRef = useRef<THREE.Mesh>(null)

  useEffect(() => {
    if (!uploadedSTL) {
      setUploadedGeom(null)
      return
    }
    const loader = new STLLoader()
    loader.load(uploadedSTL, (geom) => {
      const nonIndexed = geom.index ? geom.toNonIndexed() : geom
      nonIndexed.computeVertexNormals()
      nonIndexed.center()
      nonIndexed.computeBoundingBox()
      const size = new THREE.Vector3()
      nonIndexed.boundingBox!.getSize(size)
      const maxDim = Math.max(size.x, size.y, size.z)
      const targetMax = 160
      if (maxDim > 0) nonIndexed.scale(targetMax / maxDim, targetMax / maxDim, targetMax / maxDim)
      setUploadedGeom(nonIndexed)
    })
  }, [uploadedSTL])

  const geometry = uploadedGeom ?? proceduralGeom

  // Issues for the *current* part (NOT for uploaded STL — its geometry
  // doesn't correspond to any known issue regions).
  const issues = useMemo<MoldIssue[]>(() => {
    if (uploadedSTL) return []
    return partsLibrary[currentPartId]?.issues ?? []
  }, [uploadedSTL, currentPartId])

  // Bake colors. Triangle-by-triangle:
  //  - default: Y-gradient base
  //  - inside an issue region:
  //     * fixed       → green
  //     * pending     → severity color (animated by useFrame below)
  //     * normal      → severity color (if heatmap enabled)
  //  - non-region: base gradient
  //
  // Also stash `vertexIssueIndex` so the useFrame pulse can find affected
  // vertices in O(N) without re-classifying.
  const vertexIssueIndex = useRef<Int16Array | null>(null)

  useEffect(() => {
    if (!geometry) return
    const pos = geometry.getAttribute('position') as THREE.BufferAttribute | undefined
    if (!pos) return
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!
    const ySpan = Math.max(0.001, box.max.y - box.min.y)

    const colors = new Float32Array(pos.count * 3)
    const issueIdx = new Int16Array(pos.count) // -1 if no issue
    issueIdx.fill(-1)

    const tmp = new THREE.Color()
    const baseColor = (y: number) => {
      const t = (y - box.min.y) / ySpan
      return tmp.copy(BASE_LO).lerp(BASE_HI, t * 0.85 + 0.15)
    }

    // Triangles come in groups of 3 verts (non-indexed). Compute the
    // centroid per triangle, test region containment, paint all 3 verts.
    const triCount = pos.count / 3
    for (let t = 0; t < triCount; t++) {
      const i0 = t * 3
      const i1 = t * 3 + 1
      const i2 = t * 3 + 2
      const cx = (pos.getX(i0) + pos.getX(i1) + pos.getX(i2)) / 3
      const cy = (pos.getY(i0) + pos.getY(i1) + pos.getY(i2)) / 3
      const cz = (pos.getZ(i0) + pos.getZ(i1) + pos.getZ(i2)) / 3

      let hit = -1
      if (heatmapEnabled && issues.length > 0) {
        for (let k = 0; k < issues.length; k++) {
          const r = issues[k].region
          if (!r) continue
          if (
            cx >= r.min[0] && cx <= r.max[0] &&
            cy >= r.min[1] && cy <= r.max[1] &&
            cz >= r.min[2] && cz <= r.max[2]
          ) {
            hit = k
            break
          }
        }
      }

      let triColor: THREE.Color
      if (hit === -1) {
        triColor = baseColor(cy).clone()
      } else {
        const issue = issues[hit]
        const isFixed = fixedIssueIds.includes(issue.id)
        const hex = isFixed ? FIXED_HEX : SEVERITY_HEX[issue.severity]
        triColor = new THREE.Color(hex)
        issueIdx[i0] = hit
        issueIdx[i1] = hit
        issueIdx[i2] = hit
      }

      colors[i0 * 3] = triColor.r
      colors[i0 * 3 + 1] = triColor.g
      colors[i0 * 3 + 2] = triColor.b
      colors[i1 * 3] = triColor.r
      colors[i1 * 3 + 1] = triColor.g
      colors[i1 * 3 + 2] = triColor.b
      colors[i2 * 3] = triColor.r
      colors[i2 * 3 + 1] = triColor.g
      colors[i2 * 3 + 2] = triColor.b
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    vertexIssueIndex.current = issueIdx
  }, [geometry, issues, heatmapEnabled, fixedIssueIds])

  // Pulse the pending issue's vertices between severity color and green.
  useFrame(({ clock }) => {
    if (!pendingFixId) return
    if (!geometry || !vertexIssueIndex.current) return
    const colorAttr = geometry.getAttribute('color') as THREE.BufferAttribute | undefined
    if (!colorAttr) return
    const idx = vertexIssueIndex.current
    const targetIssueIdx = issues.findIndex((i) => i.id === pendingFixId)
    if (targetIssueIdx === -1) return

    const issue = issues[targetIssueIdx]
    const from = new THREE.Color(SEVERITY_HEX[issue.severity])
    const to = new THREE.Color(FIXED_HEX)
    const t = (Math.sin(clock.elapsedTime * 3) + 1) / 2 // 0..1
    const c = from.clone().lerp(to, t)

    for (let i = 0; i < idx.length; i++) {
      if (idx[i] !== targetIssueIdx) continue
      colorAttr.setXYZ(i, c.r, c.g, c.b)
    }
    colorAttr.needsUpdate = true
  })

  return (
    <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
      <meshPhysicalMaterial
        vertexColors
        color={showManufacturing ? '#fca5a5' : '#ffffff'}
        roughness={0.42}
        metalness={0.18}
        clearcoat={0.5}
        clearcoatRoughness={0.35}
        sheen={0.2}
        sheenColor="#ffffff"
        envMapIntensity={0.9}
      />
    </mesh>
  )
}
