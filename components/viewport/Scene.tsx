'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { Grid, Environment, ContactShadows, GizmoHelper, GizmoViewport } from '@react-three/drei'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { CameraController } from './CameraController'
import { Part } from './Part'
import { Mold } from './Mold'
import { ViewportLoader } from './ViewportLoader'

// How long the loader stays up after mount. Just a cosmetic cover for
// the brief startup flash that the original code had. Not a stability
// detector — three.js handles GL context loss/restore on its own.
const LOADER_MS = 1500

/** Probe whether the browser can hand us a WebGL context with the same
 *  params THREE.WebGLRenderer requests. If this returns false, mounting
 *  <Canvas> would throw synchronously and crash the page. */
function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const gl =
      canvas.getContext('webgl2') ??
      canvas.getContext('webgl') ??
      canvas.getContext('experimental-webgl')
    return gl !== null
  } catch {
    return false
  }
}

/**
 * Root r3f scene. The Canvas mounts immediately and Three.js handles
 * WebGL context loss/restore internally. We overlay a loader for 1.5s
 * just to hide the initial paint flash.
 */
export function Scene() {
  const showGrid = useAppStore((s) => s.viewportGrid)
  const partBounds = useAppStore((s) => s.partBounds)
  const moldMode = useAppStore((s) => s.viewportMoldMode)
  const [showLoader, setShowLoader] = useState(true)
  // null = pre-check; true/false = result. Held in state so the Retry
  // button can re-probe without a full page reload.
  const [webglOk, setWebglOk] = useState<boolean | null>(null)

  const partBox = useMemo(() => {
    if (!partBounds) return null
    return new THREE.Box3(
      new THREE.Vector3(partBounds[0], partBounds[1], partBounds[2]),
      new THREE.Vector3(partBounds[3], partBounds[4], partBounds[5])
    )
  }, [partBounds])

  useEffect(() => {
    setWebglOk(detectWebGL())
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setShowLoader(false), LOADER_MS)
    return () => clearTimeout(t)
  }, [])

  // Probe in flight — hold the loader to avoid a flash of fallback UI
  // on machines where WebGL works fine.
  if (webglOk === null) {
    return <ViewportLoader message="Initializing 3D viewport" />
  }
  if (webglOk === false) {
    return <WebGLUnavailable onRetry={() => setWebglOk(detectWebGL())} />
  }

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
        {moldMode !== 'part' && <Mold partBox={partBox} />}

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

        <GizmoHelper alignment="bottom-left" margin={[60, 60]}>
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

/** Shown in place of the 3D viewport when the browser can't give us a
 *  WebGL context (Chrome GPU subprocess in a bad state, hardware
 *  acceleration disabled, sandbox restriction, etc.). Lists the
 *  highest-success-rate fixes and points the user to the rest of the
 *  product, which doesn't need WebGL. */
function WebGLUnavailable({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="h-full w-full flex items-center justify-center p-8 bg-zinc-950">
      <div className="max-w-md w-full rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <span className="shrink-0 size-10 rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-300 flex items-center justify-center">
            <AlertTriangle className="size-5" />
          </span>
          <div>
            <h2 className="text-base font-medium text-zinc-100">3D viewport unavailable</h2>
            <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
              Your browser isn&apos;t giving us a WebGL context. This is usually a Chrome GPU-subprocess issue, not a bug in MoldLocal.
            </p>
          </div>
        </div>

        <div className="text-xs text-zinc-400 space-y-2">
          <div className="font-medium text-zinc-300">Try, in order:</div>
          <ol className="list-decimal list-inside space-y-1 leading-relaxed">
            <li>Close every Chrome window (kill stray processes in Task Manager) and reopen.</li>
            <li>Open <code className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-200">chrome://settings/system</code> and turn on &quot;Use graphics acceleration when available&quot;, then relaunch.</li>
            <li>Open <code className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-200">chrome://gpu</code> — if WebGL is &quot;Disabled&quot; everywhere, the GPU process is the problem.</li>
            <li>Try Edge or Firefox to confirm it&apos;s Chrome-specific.</li>
            <li>Reboot. The GPU process state survives Chrome restarts but not OS restarts.</li>
          </ol>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-amber-500/20">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded"
          >
            <RefreshCw className="size-3" />
            Retry
          </button>
          <Link
            href="/results"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded"
          >
            Open the dashboard
          </Link>
          <Link
            href="/analysis/costing"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded"
          >
            Analysis pages
          </Link>
        </div>

        <p className="text-[11px] text-zinc-500 leading-relaxed">
          The dashboard and the /analysis/* pages don&apos;t need WebGL and work normally.
        </p>
      </div>
    </div>
  )
}
