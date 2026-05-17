'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import { Edges, Line, Html } from '@react-three/drei'
import { useAppStore } from '@/store/useAppStore'

interface MoldProps {
  /** AABB of the current part — drives mold-block sizing. */
  partBox: THREE.Box3 | null
}

// Mold-block padding around the part bounding box (mm). Real molds
// reserve 30-60 mm wall around the cavity for cooling channels and
// strength; 35 mm is a sensible default for a hero demo.
const PADDING = 35
// Coolant channels are 8-12 mm diameter on real tooling; we draw them
// as thin tubes at a fixed offset from the cavity boundary.
const COOLING_OFFSET = 14
const COOLING_RADIUS = 4
// Gate dot scale relative to part bounding-box max dim.
const GATE_DOT_SCALE = 0.04

/**
 * Renders the mold-cavity / mold-core block pair around the part. The
 * cavity is the top half (above the parting plane); the core is the
 * bottom half. They split along the part's vertical midpoint — a naive
 * "parting plane is the equator of the AABB" heuristic. Future work:
 * derive parting plane from the silhouette projected along the parting
 * direction.
 *
 * Also overlays:
 *  - a thin emissive plane along the parting line
 *  - a gate indicator (red dot + label) on one face of the cavity
 *  - cooling-channel tubes running parallel to the parting plane
 */
export function Mold({ partBox }: MoldProps) {
  const moldMode = useAppStore((s) => s.viewportMoldMode)

  const { cavityCenter, coreCenter, blockSize, partingY, gateAnchor, coolingLines, partingExtent } =
    useMemo(() => {
      const fallback = new THREE.Box3(
        new THREE.Vector3(-90, -25, -25),
        new THREE.Vector3(90, 25, 25)
      )
      const box = partBox && !partBox.isEmpty() ? partBox : fallback

      const size = new THREE.Vector3()
      box.getSize(size)
      const center = new THREE.Vector3()
      box.getCenter(center)

      const padded = size.clone().addScalar(PADDING * 2)
      const halfY = padded.y / 2
      const partingY = center.y // midpoint of part AABB
      const cavityCenter: [number, number, number] = [center.x, partingY + halfY / 2, center.z]
      const coreCenter: [number, number, number] = [center.x, partingY - halfY / 2, center.z]
      const blockSize: [number, number, number] = [padded.x, halfY, padded.z]

      // Gate at the front-right of the cavity face, halfway between
      // parting plane and the top of the cavity. Visible from default
      // isometric camera angle.
      const gateAnchor: [number, number, number] = [
        center.x + padded.x / 2,
        partingY + halfY / 3,
        center.z,
      ]

      // Four cooling channels: two in cavity (above parting), two in
      // core (below). They run along the X axis at fixed depth.
      const lineHalfLen = padded.x / 2 + 10 // poke out of the mold so the user can see them
      const xMin = center.x - lineHalfLen
      const xMax = center.x + lineHalfLen
      const coolingLines: Array<[THREE.Vector3, THREE.Vector3]> = [
        // Cavity (top) channels — one front-of-center, one back
        [
          new THREE.Vector3(xMin, partingY + COOLING_OFFSET, center.z + padded.z / 4),
          new THREE.Vector3(xMax, partingY + COOLING_OFFSET, center.z + padded.z / 4),
        ],
        [
          new THREE.Vector3(xMin, partingY + COOLING_OFFSET, center.z - padded.z / 4),
          new THREE.Vector3(xMax, partingY + COOLING_OFFSET, center.z - padded.z / 4),
        ],
        // Core (bottom) channels — mirrored
        [
          new THREE.Vector3(xMin, partingY - COOLING_OFFSET, center.z + padded.z / 4),
          new THREE.Vector3(xMax, partingY - COOLING_OFFSET, center.z + padded.z / 4),
        ],
        [
          new THREE.Vector3(xMin, partingY - COOLING_OFFSET, center.z - padded.z / 4),
          new THREE.Vector3(xMax, partingY - COOLING_OFFSET, center.z - padded.z / 4),
        ],
      ]

      return {
        cavityCenter,
        coreCenter,
        blockSize,
        partingY,
        gateAnchor,
        coolingLines,
        partingExtent: { x: padded.x, z: padded.z, maxDim: Math.max(padded.x, padded.y, padded.z) },
      }
    }, [partBox])

  if (moldMode === 'part') return null

  // 'mold' = mold opaque-ish, no part. 'both' = mold translucent, part visible.
  const moldOpacity = moldMode === 'mold' ? 0.45 : 0.18
  const partingOpacity = moldMode === 'mold' ? 0.55 : 0.35
  const gateRadius = partingExtent.maxDim * GATE_DOT_SCALE

  return (
    <group>
      {/* Cavity (top half) — color-coded blue */}
      <mesh position={cavityCenter}>
        <boxGeometry args={blockSize} />
        <meshPhysicalMaterial
          color="#60a5fa"
          transparent
          opacity={moldOpacity}
          roughness={0.6}
          metalness={0.1}
          depthWrite={false}
        />
        <Edges color="#3b82f6" threshold={15} />
      </mesh>

      {/* Core (bottom half) — color-coded amber */}
      <mesh position={coreCenter}>
        <boxGeometry args={blockSize} />
        <meshPhysicalMaterial
          color="#f59e0b"
          transparent
          opacity={moldOpacity}
          roughness={0.6}
          metalness={0.1}
          depthWrite={false}
        />
        <Edges color="#d97706" threshold={15} />
      </mesh>

      {/* Parting line — thin emissive disc at the parting Y */}
      <mesh position={[0, partingY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[partingExtent.x + 4, partingExtent.z + 4]} />
        <meshBasicMaterial
          color="#fbbf24"
          transparent
          opacity={partingOpacity}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Cooling channels */}
      {coolingLines.map(([from, to], i) => (
        <Line
          key={i}
          points={[from, to]}
          color="#22d3ee"
          lineWidth={3}
          transparent
          opacity={moldMode === 'mold' ? 0.9 : 0.7}
        />
      ))}

      {/* Gate indicator — red dot + label */}
      <mesh position={gateAnchor}>
        <sphereGeometry args={[gateRadius, 16, 16]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>
      <Html position={gateAnchor} style={{ pointerEvents: 'none', transform: 'translate(14px, -6px)' }}>
        <div className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-rose-500/40 bg-rose-500/15 text-rose-200 whitespace-nowrap">
          Gate
        </div>
      </Html>

      {/* Labels for cavity / core when in mold-only mode */}
      {moldMode === 'mold' && (
        <>
          <Html position={cavityCenter} style={{ pointerEvents: 'none', transform: 'translate(-50%, -50%)' }}>
            <div className="text-[10px] uppercase tracking-wider px-2 py-1 rounded border border-blue-500/40 bg-blue-500/15 text-blue-200">
              Cavity
            </div>
          </Html>
          <Html position={coreCenter} style={{ pointerEvents: 'none', transform: 'translate(-50%, -50%)' }}>
            <div className="text-[10px] uppercase tracking-wider px-2 py-1 rounded border border-amber-500/40 bg-amber-500/15 text-amber-200">
              Core
            </div>
          </Html>
        </>
      )}
    </group>
  )
}
