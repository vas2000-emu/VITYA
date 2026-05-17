'use client'

import { Cpu } from 'lucide-react'

/**
 * Loading overlay shown while the 3D viewport stabilizes (5s without a
 * WebGL context-loss event before we reveal the canvas). Mini animation
 * — orbiting dots + pulsing core — keeps the demo from feeling frozen.
 */
export function ViewportLoader({ message }: { message?: string }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-950">
      <div className="flex flex-col items-center gap-5">
        {/* Animated 3-orbit "atom" */}
        <div className="relative size-24">
          {/* Core */}
          <div className="absolute inset-[34%] rounded-full bg-blue-500/40 border border-blue-400/60 flex items-center justify-center animate-pulse">
            <Cpu className="size-3 text-blue-200" />
          </div>
          {/* Orbit 1 */}
          <div
            className="absolute inset-0 rounded-full border border-blue-500/30"
            style={{ animation: 'viewport-spin 2.2s linear infinite' }}
          >
            <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 size-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
          </div>
          {/* Orbit 2 (perpendicular, slower) */}
          <div
            className="absolute inset-[10%] rounded-full border border-emerald-500/30 rotate-[60deg]"
            style={{ animation: 'viewport-spin 3.4s linear infinite reverse' }}
          >
            <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 size-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
          </div>
          {/* Orbit 3 (third axis, slowest) */}
          <div
            className="absolute inset-[20%] rounded-full border border-rose-500/30 -rotate-[60deg]"
            style={{ animation: 'viewport-spin 4.6s linear infinite' }}
          >
            <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 size-1.5 rounded-full bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.8)]" />
          </div>
        </div>

        <div className="text-center">
          <div className="text-sm font-medium text-zinc-200">
            {message ?? 'Initializing 3D viewport'}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            Waiting for paint to stabilize…
          </div>
        </div>
      </div>

      {/* keyframes via styled-jsx-style inline tag; r3f can't see DOM */}
      <style>{`
        @keyframes viewport-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
