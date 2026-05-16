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
  const lostTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  return (
    <>
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [220, 160, 220], fov: 45, near: 1, far: 2000 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        const canvas = gl.domElement
        canvas.addEventListener('webglcontextlost', (e) => {
          e.preventDefault()
          // Debounce: HMR + brief context churn often restores within ~1s.
          // Only escalate to the overlay if no restore arrives in 2s.
          if (lostTimer.current) clearTimeout(lostTimer.current)
          lostTimer.current = setTimeout(() => setLost(true), 2000)
        })
        canvas.addEventListener('webglcontextrestored', () => {
          if (lostTimer.current) {
            clearTimeout(lostTimer.current)
            lostTimer.current = null
          }
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
    {lost && <WebGLContextLossOverlay onReload={() => location.reload()} />}
    </>
  )
}
