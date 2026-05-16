'use client'

import { useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Grid, Environment, ContactShadows, GizmoHelper, GizmoViewport } from '@react-three/drei'
import { useAppStore } from '@/store/useAppStore'
import { CameraController } from './CameraController'
import { Part } from './Part'
import { WebGLContextLossOverlay } from './WebGLContextLossOverlay'
import { ViewportLoader } from './ViewportLoader'

// Set to false to silence the diagnostic logging once we've nailed the
// black-screen-after-restore issue.
const DEBUG_GL = true

// Wait this long without a context-loss event before revealing the canvas.
const STABILITY_MS = 5000

function gllog(...args: unknown[]) {
  if (DEBUG_GL) console.log('[GL]', new Date().toISOString().slice(11, 23), ...args)
}

/**
 * Root r3f scene with a "stability gate":
 *  - Canvas always mounts so r3f can initialize.
 *  - ViewportLoader covers it until we've had STABILITY_MS without any
 *    webglcontextlost event. Resets if a loss happens during the wait.
 *  - StrictMode's double-mount in dev is ignored — only true GL context
 *    loss/restore cycles matter.
 *
 * Background on the previous bug: we were auto-remounting the Canvas on
 * every contextrestored event, which created an infinite loop in dev
 * because StrictMode's intentional re-mount LOOKS like a context loss.
 * That's gone now — we let Three.js's WebGLRenderer handle restore on
 * its own (it correctly re-uploads GPU resources). The loader is purely
 * visual stability.
 */
export function Scene() {
  const showGrid = useAppStore((s) => s.viewportGrid)
  const [lost, setLost] = useState(false)
  const [stable, setStable] = useState(false)
  const [remountKey, setRemountKey] = useState(0)
  const recoveryTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  const stabilityTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const restoreExt = useRef<WEBGL_lose_context | null>(null)
  const lossCount = useRef(0)
  const restoreCount = useRef(0)
  const createdCount = useRef(0)

  const clearRecoveryTimers = () => {
    if (recoveryTimers.current.length > 0) {
      gllog(`clearing ${recoveryTimers.current.length} recovery timers`)
    }
    for (const t of recoveryTimers.current) clearTimeout(t)
    recoveryTimers.current = []
  }

  const startStabilityTimer = () => {
    if (stabilityTimer.current) clearTimeout(stabilityTimer.current)
    setStable(false)
    gllog(`stability timer started (${STABILITY_MS}ms)`)
    stabilityTimer.current = setTimeout(() => {
      gllog('stable — revealing canvas')
      setStable(true)
    }, STABILITY_MS)
  }

  // Kick off the stability countdown on initial mount. Cleanup cancels
  // it if Scene unmounts (StrictMode dev double-mount).
  useEffect(() => {
    startStabilityTimer()
    return () => {
      if (stabilityTimer.current) clearTimeout(stabilityTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const forceRestart = () => {
    gllog('manual forceRestart() — bumping remountKey')
    setRemountKey((k) => k + 1)
    startStabilityTimer()
  }

  return (
    <>
      <Canvas
        key={remountKey}
        shadows
        dpr={[1, 2]}
        camera={{ position: [220, 160, 220], fov: 45, near: 10, far: 1500 }}
        gl={{ antialias: true, powerPreference: 'high-performance', logarithmicDepthBuffer: false }}
        onCreated={({ gl, size }) => {
          createdCount.current += 1
          gllog(`Canvas onCreated #${createdCount.current}`, {
            remountKey,
            size: `${size.width}x${size.height}`,
            drawingBufferSize: `${gl.domElement.width}x${gl.domElement.height}`,
          })

          const canvas = gl.domElement
          restoreExt.current = gl.getContext().getExtension('WEBGL_lose_context')
          if (!restoreExt.current) {
            gllog('WARN: WEBGL_lose_context extension not available')
          }

          canvas.addEventListener('webglcontextlost', (e) => {
            e.preventDefault()
            lossCount.current += 1
            gllog(`webglcontextlost #${lossCount.current}`, {
              statusMessage: (e as WebGLContextEvent).statusMessage,
            })

            // Reset stability gate — user must wait another STABILITY_MS
            // of quiet before we reveal the canvas again.
            startStabilityTimer()

            // Staggered restore attempts. If still lost at 5s, hard
            // remount via Canvas key bump. Overlay at 8s as last resort.
            clearRecoveryTimers()
            recoveryTimers.current.push(
              setTimeout(() => restoreExt.current?.restoreContext(), 0),
              setTimeout(() => restoreExt.current?.restoreContext(), 500),
              setTimeout(() => restoreExt.current?.restoreContext(), 2000),
              setTimeout(() => {
                gllog('5s elapsed, hard-remount via Canvas key bump')
                setRemountKey((k) => k + 1)
              }, 5000),
              setTimeout(() => {
                gllog('8s elapsed — showing recovery overlay')
                setLost(true)
              }, 8000),
            )
          })

          canvas.addEventListener('webglcontextrestored', () => {
            restoreCount.current += 1
            gllog(`webglcontextrestored #${restoreCount.current}`)
            clearRecoveryTimers()
            setLost(false)
            // DON'T auto-remount here. Three.js's WebGLRenderer handles
            // restoration correctly on its own. The previous "auto-bump
            // remountKey" was the bug that caused the loss/remount/loss
            // loop the user was seeing.
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

        <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
          <GizmoViewport
            labels={['X', 'Y', 'Z']}
            axisColors={['#ef4444', '#22c55e', '#3b82f6']}
            labelColor="#fafafa"
          />
        </GizmoHelper>

        <CameraController />
      </Canvas>

      {/* Stability loader sits ABOVE the canvas while it warms up. Fades
          out via opacity once stable. Pointer-events:none after fadeout
          so it stops blocking OrbitControls. */}
      <div
        className={`absolute inset-0 transition-opacity duration-500 ${
          stable ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <ViewportLoader message="Initializing 3D viewport" />
      </div>

      {lost && (
        <WebGLContextLossOverlay
          onReload={() => location.reload()}
          onRestart={forceRestart}
        />
      )}
    </>
  )
}
