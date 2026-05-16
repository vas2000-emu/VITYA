'use client'

import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { OrbitControls as DreiOrbit } from '@react-three/drei'
import type { OrbitControls } from 'three-stdlib'
import * as THREE from 'three'
import { useAppStore, type ViewportPreset } from '@/store/useAppStore'

/**
 * Hard-coded camera positions matching the original Canvas-2D view presets
 * (Home/Isometric/Front/Top/Right). When `viewportActiveView` changes in
 * the store, we tween the camera to the new position over ~400ms.
 */
const VIEW_TARGETS: Record<ViewportPreset, [number, number, number]> = {
  home: [220, 160, 220],
  isometric: [220, 160, 220],
  front: [0, 0, 320],
  top: [0, 320, 0.001], // tiny y nudge keeps OrbitControls from going gimbal-locked
  right: [320, 0, 0],
}

const TWEEN_MS = 400

// Map feature-tree IDs to camera presets so clicking a feature snaps
// the camera to a useful view.
const FEATURE_VIEW: Record<string, ViewportPreset> = {
  top: 'top',
  front: 'front',
  right: 'right',
  origin: 'isometric',
  baseBody: 'isometric',
  sketch1: 'top',
  sketch2: 'top',
  extrude1: 'isometric',
  extrude2: 'isometric',
  fillet1: 'isometric',
}

// Features that need a custom camera position + orbit target (not just a preset).
// pos: where the camera goes; target: where it looks and orbits around.
const FEATURE_CAMERA_OVERRIDE: Record<string, { pos: [number, number, number]; target: [number, number, number] }> = {
  // Sensor-mount bosses sit on the back face at (±78, -2, -11) — camera
  // goes behind the bumper, centered between both bosses.
  mountingHole: { pos: [0, 15, -140], target: [0, -2, -11] },
}

export function CameraController() {
  const camera = useThree((s) => s.camera)
  const activeView = useAppStore((s) => s.viewportActiveView)
  const tool = useAppStore((s) => s.viewportTool)
  const zoomNudge = useAppStore((s) => s.viewportZoomNudge)
  const selectedFeature = useAppStore((s) => s.selectedFeature)
  const setViewportView = useAppStore((s) => s.setViewportView)

  const controlsRef = useRef<OrbitControls>(null)

  const tween = useRef<{
    from: THREE.Vector3
    to: THREE.Vector3
    start: number
  } | null>(null)

  useEffect(() => {
    if (!activeView) return
    const [x, y, z] = VIEW_TARGETS[activeView]
    // Reset orbit target to origin when switching to a standard preset.
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0)
      controlsRef.current.update()
    }
    tween.current = {
      from: camera.position.clone(),
      to: new THREE.Vector3(x, y, z),
      start: performance.now(),
    }
  }, [activeView, camera])

  useEffect(() => {
    if (!selectedFeature) return
    const override = FEATURE_CAMERA_OVERRIDE[selectedFeature]
    if (override) {
      tween.current = {
        from: camera.position.clone(),
        to: new THREE.Vector3(...override.pos),
        start: performance.now(),
      }
      if (controlsRef.current) {
        controlsRef.current.target.set(...override.target)
        controlsRef.current.update()
      }
      return
    }
    const preset = FEATURE_VIEW[selectedFeature]
    if (preset) setViewportView(preset)
  }, [selectedFeature, setViewportView, camera])

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
    const lookTarget = controlsRef.current ? controlsRef.current.target : new THREE.Vector3(0, 0, 0)
    camera.lookAt(lookTarget)
    if (t >= 1) tween.current = null
  })

  return (
    <DreiOrbit
      ref={controlsRef}
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
