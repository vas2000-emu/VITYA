'use client'

import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Grid, Environment, ContactShadows, GizmoHelper, GizmoViewport } from '@react-three/drei'
import { useAppStore } from '@/store/useAppStore'
import { CameraController } from './CameraController'
import { Part } from './Part'
import { ViewportLoader } from './ViewportLoader'

// How long the loader stays up after mount. Just a cosmetic cover for
// the brief startup flash that the original code had. Not a stability
// detector — three.js handles GL context loss/restore on its own.
const LOADER_MS = 1500

/**
 * Root r3f scene. The Canvas mounts immediately and Three.js handles
 * WebGL context loss/restore internally. We overlay a loader for 1.5s
 * just to hide the initial paint flash.
 */
export function Scene() {
  const showGrid = useAppStore((s) => s.viewportGrid)
  const [showLoader, setShowLoader] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setShowLoader(false), LOADER_MS)
    return () => clearTimeout(t)
  }, [])

  return (
    <>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [220, 160, 220], fov: 45, near: 10, far: 1500 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
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
            position={[0, -42, 0]}
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
          position={[0, -41.5, 0]}
          opacity={0.45}
          scale={300}
          blur={2.4}
          far={120}
        />

        <Environment preset="city" />

        <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
          <GizmoViewport
            labels={['X', 'Y', 'Z']}
            axisColors={['#ef4444', '#22c55e', '#3b82f6']}
            labelColor="#fafafa"
          />
        </GizmoHelper>

        <CameraController />
      </Canvas>

      {/* Cosmetic loader — fades out after LOADER_MS to cover the
          brief startup flash. */}
      <div
        className={`absolute inset-0 transition-opacity duration-500 ${
          showLoader ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <ViewportLoader message="Initializing 3D viewport" />
      </div>
    </>
  )
}
