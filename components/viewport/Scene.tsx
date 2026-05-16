'use client'

import { useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Grid, Environment, ContactShadows, GizmoHelper, GizmoViewport } from '@react-three/drei'
import { useAppStore } from '@/store/useAppStore'
import { CameraController } from './CameraController'
import { Part } from './Part'
import { WebGLContextLossOverlay } from './WebGLContextLossOverlay'

// Set to false to silence the diagnostic logging once we've nailed the
// black-screen-after-restore issue.
const DEBUG_GL = true

function gllog(...args: unknown[]) {
  if (DEBUG_GL) console.log('[GL]', new Date().toISOString().slice(11, 23), ...args)
}

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
  // Count loss / restore events so we can spot rapid oscillation.
  const lossCount = useRef(0)
  const restoreCount = useRef(0)

  const clearRecoveryTimers = () => {
    if (recoveryTimers.current.length > 0) {
      gllog(`clearing ${recoveryTimers.current.length} pending recovery timers`)
    }
    for (const t of recoveryTimers.current) clearTimeout(t)
    recoveryTimers.current = []
  }

  const forceRestart = () => {
    gllog('manual forceRestart() invoked')
    try {
      restoreExt.current?.loseContext()
      setTimeout(() => restoreExt.current?.restoreContext(), 50)
    } catch (err) {
      gllog('forceRestart soft path threw, bumping remountKey', err)
      setRemountKey((k) => k + 1)
    }
  }

  return (
    <>
    <Canvas
      key={remountKey}
      shadows
      dpr={[1, 2]}
      camera={{ position: [220, 160, 220], fov: 45, near: 10, far: 1500 }}
      gl={{ antialias: true, powerPreference: 'high-performance', logarithmicDepthBuffer: false }}
      onCreated={({ gl, scene, camera, size }) => {
        gllog('Canvas onCreated', {
          remountKey,
          size: `${size.width}x${size.height}`,
          drawingBufferSize: `${gl.domElement.width}x${gl.domElement.height}`,
          rendererInfo: gl.info.render,
        })

        const canvas = gl.domElement
        restoreExt.current = gl.getContext().getExtension('WEBGL_lose_context')
        gllog('WEBGL_lose_context extension', restoreExt.current ? 'available' : 'NOT AVAILABLE')

        canvas.addEventListener('webglcontextlost', (e) => {
          e.preventDefault()
          lossCount.current += 1
          gllog(`webglcontextlost #${lossCount.current}`, {
            statusMessage: (e as WebGLContextEvent).statusMessage,
          })

          // Try to recover several times with staggered retries before
          // escalating. Browsers vary on when they grant restoreContext()
          // (some immediately, some only after the page settles), so
          // hammer it at 0 / 250 / 1000 / 3000 ms. If 3s in we're still
          // not restored, hard-remount the Canvas — that almost always
          // wins. Only if that also fails (rare) do we show the overlay
          // at 8s.
          clearRecoveryTimers()
          recoveryTimers.current.push(
            setTimeout(() => {
              gllog('retry restoreContext @ 0ms')
              restoreExt.current?.restoreContext()
            }, 0),
            setTimeout(() => {
              gllog('retry restoreContext @ 250ms')
              restoreExt.current?.restoreContext()
            }, 250),
            setTimeout(() => {
              gllog('retry restoreContext @ 1000ms')
              restoreExt.current?.restoreContext()
            }, 1000),
            setTimeout(() => {
              gllog('retry restoreContext @ 3000ms')
              restoreExt.current?.restoreContext()
            }, 3000),
            setTimeout(() => {
              gllog('5s elapsed without restore → hard-remount via Canvas key bump')
              setRemountKey((k) => k + 1)
            }, 5000),
            setTimeout(() => {
              gllog('8s elapsed → showing recovery overlay')
              setLost(true)
            }, 8000),
          )
        })

        canvas.addEventListener('webglcontextrestored', () => {
          restoreCount.current += 1
          gllog(`webglcontextrestored #${restoreCount.current}`, {
            sceneChildren: scene.children.length,
            cameraPos: camera.position.toArray().map((n) => Math.round(n)),
          })
          clearRecoveryTimers()
          setLost(false)
          // KEY FIX FOR BLACK-SCREEN-AFTER-RESTORE:
          // Some browsers (esp. Chrome on integrated GPUs) restore the
          // GL context but Three.js's existing WebGLRenderer has stale
          // GPU resource pointers and never repaints. Bumping the
          // Canvas key tears r3f down and rebuilds — guaranteed clean.
          gllog('bumping remountKey to force r3f rebuild post-restore')
          setRemountKey((k) => k + 1)
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

      {/* Axes gizmo in the bottom-right corner. Standard three.js
          convention: X-right (red), Y-up (green), Z-toward-viewer
          (blue). Rotates with the camera; clicking an axis handle
          snaps the camera to that view. */}
      <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
        <GizmoViewport
          labels={['X', 'Y', 'Z']}
          axisColors={['#ef4444', '#22c55e', '#3b82f6']}
          labelColor="#fafafa"
        />
      </GizmoHelper>

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
