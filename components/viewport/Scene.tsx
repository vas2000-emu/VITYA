'use client'

import { Canvas } from '@react-three/fiber'
import { Grid, Environment, ContactShadows } from '@react-three/drei'
import { useAppStore } from '@/store/useAppStore'
import { CameraController } from './CameraController'
import { Part } from './Part'

/**
 * Root r3f scene. Lighting + ground + axes live here; the actual part
 * geometry is in <Part />. Camera presets are driven from the store via
 * <CameraController />.
 */
export function Scene() {
  const showGrid = useAppStore((s) => s.viewportGrid)

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [220, 160, 220], fov: 45, near: 1, far: 2000 }}
      gl={{ antialias: true }}
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
  )
}
