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
      // Scale up to roughly fill the same volume as the procedural parts.
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

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        color={showManufacturing ? '#7c2d12' : '#3b82f6'}
        roughness={0.55}
        metalness={0.15}
        flatShading
      />
    </mesh>
  )
}
