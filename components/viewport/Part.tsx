'use client'

import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { STLLoader } from 'three-stdlib'
import { useAppStore } from '@/store/useAppStore'
import { getPartGeometry, type PartId } from './partGeometry'

/**
 * Renders either:
 *   1. The user-uploaded STL (via Blob URL stored in useAppStore.uploadedSTL), or
 *   2. The procedural geometry for the current `currentPartId` (bracket /
 *      phoneCase / droneArm).
 *
 * Stays as a single <mesh> so vertex-color heatmaps (Step 5) and hover
 * tooltips (Step 8) can attach later without refactoring.
 */
export function Part() {
  const uploadedSTL = useAppStore((s) => s.uploadedSTL)
  const currentPartId = useAppStore((s) => s.currentPartId) as PartId
  const showManufacturing = useAppStore((s) => s.showManufacturing)

  const proceduralGeom = useMemo(() => getPartGeometry(currentPartId), [currentPartId])
  const [uploadedGeom, setUploadedGeom] = useState<THREE.BufferGeometry | null>(null)

  useEffect(() => {
    if (!uploadedSTL) {
      setUploadedGeom(null)
      return
    }
    const loader = new STLLoader()
    loader.load(uploadedSTL, (geom) => {
      geom.computeVertexNormals()
      geom.center()
      geom.computeBoundingBox()
      const size = new THREE.Vector3()
      geom.boundingBox!.getSize(size)
      const maxDim = Math.max(size.x, size.y, size.z)
      const targetMax = 160
      if (maxDim > 0) geom.scale(targetMax / maxDim, targetMax / maxDim, targetMax / maxDim)
      setUploadedGeom(geom)
    })
  }, [uploadedSTL])

  const geometry = uploadedGeom ?? proceduralGeom

  // Bake a subtle gradient along the local Y axis (top-lighter, bottom-darker)
  // for visual depth even before any heatmap overlay lands. Re-baked when the
  // geometry changes.
  useEffect(() => {
    if (!geometry) return
    const pos = geometry.getAttribute('position') as THREE.BufferAttribute | undefined
    if (!pos) return
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!
    const ySpan = Math.max(0.001, box.max.y - box.min.y)
    const colors = new Float32Array(pos.count * 3)
    const base = new THREE.Color('#7dd3fc') // sky-300 — polished plastic tint
    const tint = new THREE.Color('#1e3a8a') // navy underneath
    const c = new THREE.Color()
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i)
      const t = (y - box.min.y) / ySpan
      c.copy(tint).lerp(base, t * 0.85 + 0.15)
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  }, [geometry])

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
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
