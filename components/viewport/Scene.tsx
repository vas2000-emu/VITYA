'use client'

import { useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Grid, Environment, ContactShadows } from '@react-three/drei'
import { useAppStore } from '@/store/useAppStore'
import { CameraController } from './CameraController'
import { Part } from './Part'
import { WebGLContextLossOverlay } from './WebGLContextLossOverlay'

/**
 * Root r3f scene. Lighting + ground + axes live here; the actual part
 * geometry is in <Part />. Camera presets are driven from the store via
 * <CameraController />.
 */
export function Scene() {
  const showGrid = useAppStore((s) => s.viewportGrid)
  const [lost, setLost] = useState(false)
  const [remountKey, setRemountKey] = useState(0)
  const recoveryTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  const restoreExt = useRef<WEBGL_lose_context | null>(null)

  const clearRecoveryTimers = () => {
    for (const t of recoveryTimers.current) clearTimeout(t)
    recoveryTimers.current = []
  }

  const forceRestart = () => {
    // Soft path: WEBGL_lose_context.restoreContext usually rebuilds in
    // place. Fall back to a hard React remount (Canvas key bump) which
    // tears down the GL context entirely.
    try {
      restoreExt.current?.loseContext()
      setTimeout(() => restoreExt.current?.restoreContext(), 50)
    } catch {
      setRemountKey((k) => k + 1)
    }
  }

  return (
    <>
    <Canvas
      key={remountKey}
      shadows
      dpr={[1, 2]}
      camera={{ position: [220, 160, 220], fov: 45, near: 1, far: 2000 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        const canvas = gl.domElement
        restoreExt.current = gl.getContext().getExtension('WEBGL_lose_context')
        canvas.addEventListener('webglcontextlost', (e) => {
          e.preventDefault()
          // Try to recover several times with staggered retries before
          // escalating. Browsers vary on when they grant restoreContext()
          // (some immediately, some only after the page settles), so
          // hammer it at 0 / 250 / 1000 / 3000 ms. If 3s in we're still
          // not restored, hard-remount the Canvas — that almost always
          // wins. Only if that also fails (rare) do we show the overlay
          // at 8s.
          clearRecoveryTimers()
          recoveryTimers.current.push(
            setTimeout(() => restoreExt.current?.restoreContext(), 0),
            setTimeout(() => restoreExt.current?.restoreContext(), 250),
            setTimeout(() => restoreExt.current?.restoreContext(), 1000),
            setTimeout(() => restoreExt.current?.restoreContext(), 3000),
            setTimeout(() => setRemountKey((k) => k + 1), 5000),
            setTimeout(() => setLost(true), 8000),
          )
        })
        canvas.addEventListener('webglcontextrestored', () => {
          clearRecoveryTimers()
          setLost(false)
        })
      }}
    >
      <color attach="background" args={['#09090b']} />
      <ambientLight intensity={0.45} />
      <directionalLight
        position={[180, 240, 120]}
        intensity={1.1}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-120, 80, -160]} intensity={0.35} />

      <Part />

      {showGrid && (
        <Grid
          position={[0, -40, 0]}
          args={[600, 600]}
          cellSize={20}
          cellThickness={0.6}
          cellColor="#27272a"
          sectionSize={100}
          sectionThickness={1.2}
          sectionColor="#3f3f46"
          fadeDistance={500}
          fadeStrength={1.4}
          infiniteGrid
        />
      )}

      <ContactShadows
        position={[0, -39.5, 0]}
        opacity={0.45}
        scale={300}
        blur={2.4}
        far={120}
      />

      <Environment preset="city" />

      <CameraController />
    </Canvas>
    {lost && (
      <WebGLContextLossOverlay
        onReload={() => location.reload()}
        onRestart={forceRestart}
      />
    )}
    </>
  )
}
