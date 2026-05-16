'use client'

import { Suspense } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { Scene } from './viewport/Scene'
import { STLDropzone } from './viewport/STLDropzone'
import { ViewportToolbar } from './viewport/ViewportToolbar'

const PART_NAMES: Record<string, string> = {
  bracket: 'Plastic Bracket — bracket.stl',
  phoneCase: 'Phone Case Back — phone_case.stl',
  droneArm: 'Drone Arm — drone_arm.stl',
  bumper: 'Front Bumper Fascia — bumper.stl',
}

/**
 * Thin shell composing the r3f scene, toolbar overlay, and STL upload
 * dropzone. The previous 290-line Canvas-2D implementation lives only
 * in git history now.
 */
export function ViewportContainer() {
  const currentPartId = useAppStore((s) => s.currentPartId)
  const uploadedSTL = useAppStore((s) => s.uploadedSTL)

  const partName = uploadedSTL
    ? 'User upload'
    : PART_NAMES[currentPartId] ?? 'Untitled'

  return (
    <div className="relative w-full h-full bg-zinc-950">
      <ViewportToolbar partName={partName} />
      <STLDropzone>
        <Suspense fallback={<SceneFallback />}>
          <Scene />
        </Suspense>
      </STLDropzone>
    </div>
  )
}

function SceneFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center text-zinc-500 text-sm">
      Loading 3D scene…
    </div>
  )
}
