'use client'

import { AlertTriangle, RotateCcw } from 'lucide-react'

/**
 * Friendly fallback when WebGL context is lost (e.g. Chrome stole it
 * because too many tabs/windows of the app are open simultaneously, or
 * GPU went to sleep). Renders over the affected canvas with a Reload
 * button.
 */
export function WebGLContextLossOverlay({ onReload }: { onReload: () => void }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-zinc-950/95 backdrop-blur">
      <div className="max-w-sm text-center px-6 py-5 rounded-xl border border-amber-500/40 bg-amber-500/10">
        <AlertTriangle className="size-6 text-amber-300 mx-auto mb-2" />
        <h3 className="text-sm font-medium text-zinc-100 mb-1">3D viewport disconnected</h3>
        <p className="text-xs text-zinc-400 leading-relaxed mb-4">
          The browser reclaimed this WebGL context — usually happens when several tabs of the
          app are open at once. Click reload to reconnect.
        </p>
        <button
          type="button"
          onClick={onReload}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 rounded-md transition-colors"
        >
          <RotateCcw className="size-3.5" />
          Reload viewport
        </button>
      </div>
    </div>
  )
}
