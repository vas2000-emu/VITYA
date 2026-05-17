'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { STLLoader } from 'three-stdlib'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { useAppStore } from '@/store/useAppStore'
import { useResultsStore } from '@/store/useResultsStore'
import { getDashboardAnalysis } from '@/lib/mockMoldAnalysis'
import { buildCsgGeometry, buildCustomGeometry, getPartGeometry, type PartId } from './partGeometry'
import { useDebouncedGeometryParams } from './useDebouncedGeometryParams'
import { MoldCheckerMaterial } from './MoldCheckerMaterial'
import type { MoldIssue, MoldIssueSeverity } from '@/lib/types'

const SEVERITY_HEX: Record<MoldIssueSeverity, string> = {
  high: '#ef4444', // rose-500
  medium: '#f59e0b', // amber-500
  low: '#10b981', // emerald-500
}

const FIXED_HEX = '#10b981' // emerald-500
const BASE_HI = new THREE.Color('#d4d4d8') // zinc-300 top
const BASE_LO = new THREE.Color('#3f3f46') // zinc-700 bottom

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
  const moldMode = useAppStore((s) => s.viewportMoldMode)
  const setPartBounds = useAppStore((s) => s.setPartBounds)
  const setUploadedSTLBbox = useAppStore((s) => s.setUploadedSTLBbox)
  const setPendingUploadAnalysis = useAppStore((s) => s.setPendingUploadAnalysis)

  const fixedIssueIds = useResultsStore((s) => s.fixedIssueIds)
  const pendingFixId = useResultsStore((s) => s.pendingFixId)
  const selectIssue = useResultsStore((s) => s.selectIssue)

  // Live geometry params come from the design Parameters panel via the
  // store, debounced ~200ms so dragging a slider doesn't trash the
  // useMemo / vertex-color recompute on every keystroke.
  const geomParams = useDebouncedGeometryParams(200)
  const customPartSpec = useAppStore((s) => s.customPartSpec)
  const proceduralGeom = useMemo(() => {
    // AI-generated parts dispatch to buildCustomGeometry against the
    // spec held in the store. The spec already encodes L/H/W in mm so
    // we skip getPartGeometry's per-axis scaling step (would double-
    // scale) and just apply the draft taper on top. We branch on the
    // spec's presence rather than currentPartId === 'custom' so each
    // user-registered AI part can have a unique id (for sidebar /
    // ribbon highlighting) while still rendering through this path.
    if (customPartSpec) {
      // CSG path: spec carries a constructive tree (e.g. box minus
      // cylinder). Evaluate via three-bvh-csg.
      if (customPartSpec.csg) {
        const geom = buildCsgGeometry(customPartSpec.csg)
        // Fit the CSG result into the spec's bbox so the camera and
        // dimensions still agree. Compute bbox + non-uniform scale.
        geom.computeBoundingBox()
        const box = geom.boundingBox!
        const size = new THREE.Vector3()
        box.getSize(size)
        const sx = size.x > 0 ? customPartSpec.partLength / size.x : 1
        const sy = size.y > 0 ? customPartSpec.partHeight / size.y : 1
        const sz = size.z > 0 ? customPartSpec.partWidth / size.z : 1
        geom.scale(sx, sy, sz)
        geom.computeVertexNormals()
        geom.computeBoundingBox()
        return geom
      }
      const geom = buildCustomGeometry(
        customPartSpec.shape,
        customPartSpec.partLength,
        customPartSpec.partHeight,
        customPartSpec.partWidth,
        customPartSpec.wallThickness,
      )
      geom.computeVertexNormals()
      geom.computeBoundingBox()
      return geom
    }
    return getPartGeometry(currentPartId, geomParams)
  }, [currentPartId, geomParams, customPartSpec])
  const [uploadedGeom, setUploadedGeom] = useState<THREE.BufferGeometry | null>(null)
  const meshRef = useRef<THREE.Mesh>(null)

  // Hover state — derived from raycast pointer events. We store the
  // hovered issue + a world-space point so Tooltip3D can render via
  // <Html> in the right spot.
  const [hover, setHover] = useState<{
    issue: MoldIssue
    point: [number, number, number]
  } | null>(null)

  useEffect(() => {
    if (!uploadedSTL) {
      setUploadedGeom((prev) => { prev?.dispose(); return null })
      setUploadedSTLBbox(null)
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
      // Publish the ORIGINAL STL bbox so UploadAnalyzeModal can pre-fill
      // L/W/H without distortion. The user picks the unit (mm vs in) in
      // the modal — STL files don't carry units, so we surface the raw
      // numbers and let them decide.
      setUploadedSTLBbox([size.x, size.y, size.z])
      setPendingUploadAnalysis(true)
      const maxDim = Math.max(size.x, size.y, size.z)
      const targetMax = 160
      if (maxDim > 0) nonIndexed.scale(targetMax / maxDim, targetMax / maxDim, targetMax / maxDim)
      setUploadedGeom((prev) => { prev?.dispose(); return nonIndexed })
    })
  }, [uploadedSTL, setUploadedSTLBbox, setPendingUploadAnalysis])

  const geometry = uploadedGeom ?? proceduralGeom

  // Issues for the *current* part (NOT for uploaded STL — its geometry
  // doesn't correspond to any known issue regions).
  const issues = useMemo<MoldIssue[]>(() => {
    if (uploadedSTL) return []
    return getDashboardAnalysis(currentPartId)?.issues ?? []
  }, [uploadedSTL, currentPartId])

  const pendingIssueIdx = useMemo(
    () => (pendingFixId ? issues.findIndex((i) => i.id === pendingFixId) : -1),
    [pendingFixId, issues]
  )

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
    setPartBounds([box.min.x, box.min.y, box.min.z, box.max.x, box.max.y, box.max.z])
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
  }, [geometry, issues, heatmapEnabled, fixedIssueIds, setPartBounds])

  // Reset cursor if the component unmounts while the pointer is hovering.
  useEffect(() => {
    return () => {
      document.body.style.cursor = ''
    }
  }, [])

  // Pulse the pending issue's vertices between severity color and green.
  useFrame(({ clock }) => {
    if (!pendingFixId) return
    if (!geometry || !vertexIssueIndex.current) return
    const colorAttr = geometry.getAttribute('color') as THREE.BufferAttribute | undefined
    if (!colorAttr) return
    const idx = vertexIssueIndex.current
    if (pendingIssueIdx === -1) return

    const issue = issues[pendingIssueIdx]
    const from = new THREE.Color(SEVERITY_HEX[issue.severity])
    const to = new THREE.Color(FIXED_HEX)
    const t = (Math.sin(clock.elapsedTime * 3) + 1) / 2 // 0..1
    const c = from.clone().lerp(to, t)

    for (let i = 0; i < idx.length; i++) {
      if (idx[i] !== pendingIssueIdx) continue
      colorAttr.setXYZ(i, c.r, c.g, c.b)
    }
    colorAttr.needsUpdate = true
  })

  // Hover handler: raycast hit gives us a world-space point; we look it
  // up against each issue's region AABB. First match wins. Cursor turns
  // into a pointer to telegraph clickability.
  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!heatmapEnabled || issues.length === 0) {
      if (hover) setHover(null)
      return
    }
    const p = e.point
    for (const issue of issues) {
      const r = issue.region
      if (!r) continue
      if (
        p.x >= r.min[0] && p.x <= r.max[0] &&
        p.y >= r.min[1] && p.y <= r.max[1] &&
        p.z >= r.min[2] && p.z <= r.max[2]
      ) {
        if (hover?.issue.id !== issue.id) {
          setHover({ issue, point: [p.x, p.y, p.z] })
        }
        document.body.style.cursor = 'pointer'
        return
      }
    }
    if (hover) setHover(null)
    document.body.style.cursor = ''
  }
  const handlePointerOut = () => {
    setHover(null)
    document.body.style.cursor = ''
  }
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!hover) return
    e.stopPropagation()
    selectIssue(hover.issue.id)
  }

  // When the mold is visible (either translucent overlay or opaque
  // tooling view), swap to the UV-checker placeholder so the part reads
  // as "this is the cavity volume" rather than a finished surface. The
  // DFM heatmap material returns when moldMode is 'part'.
  const showChecker = moldMode !== 'part'

  return (
    <>
      <mesh
        ref={meshRef}
        geometry={geometry}
        castShadow
        receiveShadow
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        {showChecker ? (
          <MoldCheckerMaterial
            stripeWidth={6}
            duty={0.5}
            slant={[1, 1, 0]}
            alphaOn={0.55}
            alphaOff={0.45}
          />
        ) : (
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
        )}
      </mesh>
      {hover && !showChecker && <IssueTooltip issue={hover.issue} point={hover.point} />}
    </>
  )
}

function IssueTooltip({
  issue,
  point,
}: {
  issue: MoldIssue
  point: [number, number, number]
}) {
  const severityClass =
    issue.severity === 'high'
      ? 'border-rose-500/60 bg-rose-500/15 text-rose-200'
      : issue.severity === 'medium'
        ? 'border-amber-400/60 bg-amber-500/15 text-amber-100'
        : 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100'

  return (
    <Html
      position={point}
      style={{
        pointerEvents: 'none',
        transform: 'translate(12px, 12px)',
      }}
      zIndexRange={[100, 0]}
    >
      <div
        className={`w-[200px] rounded-md border bg-zinc-950/90 backdrop-blur px-3 py-2 text-[11px] shadow-lg ${severityClass}`}
      >
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="font-medium text-zinc-100 truncate">{issue.title}</span>
          <span className="text-[9px] uppercase tracking-wider opacity-80">
            {issue.severity}
          </span>
        </div>
        <div className="text-zinc-300 leading-snug">{issue.recommendation}</div>
        <div className="mt-1 text-[9px] uppercase tracking-wider text-zinc-500">
          Click to focus in panel
        </div>
      </div>
    </Html>
  )
}
