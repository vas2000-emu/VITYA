'use client'

import { Suspense, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, ContactShadows } from '@react-three/drei'
import { Part } from '@/components/viewport/Part'
import { WebGLContextLossOverlay } from '@/components/viewport/WebGLContextLossOverlay'

/**
 * Compact non-interactive 3D preview used inside the results dashboard's
 * PartPreview card. Renders the same procedural geometry as the main
 * workspace viewport so switching parts shows the same shape in both
 * places. No controls — hotspots are 2D overlays positioned above this.
 *
 * frameloop="demand" so we don't run a 60fps loop on a static preview;
 * keeps Chrome's WebGL context budget healthy when multiple tabs of the
 * app are open at once.
 */
export function MiniViewport() {
  const [lost, setLost] = useState(false)

  return (
    <>
      <Canvas
        shadows
        dpr={[1, 1.5]}
        frameloop="demand"
        camera={{ position: [200, 150, 220], fov: 38, near: 1, far: 2000 }}
        gl={{ antialias: true, powerPreference: 'low-power' }}
        className="absolute inset-0"
        onCreated={({ gl }) => {
          const canvas = gl.domElement
          canvas.addEventListener('webglcontextlost', (e) => {
            e.preventDefault()
            setLost(true)
          })
          canvas.addEventListener('webglcontextrestored', () => setLost(false))
        }}
      >
        <color attach="background" args={['#09090b']} />
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[180, 240, 120]}
          intensity={1.05}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight position={[-120, 80, -160]} intensity={0.32} />
        <Suspense fallback={null}>
          <Part />
        </Suspense>
        <ContactShadows position={[0, -39.5, 0]} opacity={0.4} scale={300} blur={2.4} far={120} />
        <Environment preset="city" />
      </Canvas>
      {lost && <WebGLContextLossOverlay onReload={() => location.reload()} />}
    </>
  )
}
