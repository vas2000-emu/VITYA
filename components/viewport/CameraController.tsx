'use client'

import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { OrbitControls as DreiOrbit } from '@react-three/drei'
import * as THREE from 'three'
import { useAppStore, type ViewportPreset } from '@/store/useAppStore'

const VIEW_TARGETS: Record<ViewportPreset, [number, number, number]> = {
  home: [220, 160, 220],
  isometric: [220, 160, 220],
  front: [0, 0, 320],
  top: [0, 320, 0.001], // tiny y nudge keeps OrbitControls from going gimbal-locked
  right: [320, 0, 0],
}

const TWEEN_MS = 400

export function CameraController() {
  const camera = useThree((s) => s.camera)
  const activeView = useAppStore((s) => s.viewportActiveView)
  const tool = useAppStore((s) => s.viewportTool)
  const zoomNudge = useAppStore((s) => s.viewportZoomNudge)

  const tween = useRef<{
    from: THREE.Vector3
    to: THREE.Vector3
    start: number
  } | null>(null)

  useEffect(() => {
    if (!activeView) return
    const [x, y, z] = VIEW_TARGETS[activeView]
    tween.current = {
      from: camera.position.clone(),
      to: new THREE.Vector3(x, y, z),
      start: performance.now(),
    }
  }, [activeView, camera])

  // Toolbar zoom-in/out buttons bump `viewportZoomNudge`. We translate the
  // camera along its view direction. Sign of delta is encoded in the nudge
  // value the toolbar dispatched (positive = closer, negative = farther).
  const lastZoom = useRef(zoomNudge)
  useEffect(() => {
    const delta = zoomNudge - lastZoom.current
    lastZoom.current = zoomNudge
    if (delta === 0) return
    const dir = camera.position.clone().normalize()
    const dist = camera.position.length()
    const next = Math.max(60, Math.min(800, dist - delta * 40))
    camera.position.copy(dir.multiplyScalar(next))
    camera.lookAt(0, 0, 0)
  }, [zoomNudge, camera])

  useFrame(() => {
    if (!tween.current) return
    const t = Math.min(1, (performance.now() - tween.current.start) / TWEEN_MS)
    // ease-out cubic
    const k = 1 - Math.pow(1 - t, 3)
    camera.position.lerpVectors(tween.current.from, tween.current.to, k)
    camera.lookAt(0, 0, 0)
    if (t >= 1) tween.current = null
  })

  return (
    <DreiOrbit
      makeDefault
      enableRotate={tool === 'rotate'}
      enablePan={tool === 'pan'}
      enableZoom
      minDistance={60}
      maxDistance={800}
      dampingFactor={0.08}
      target={[0, 0, 0]}
    />
  )
}
