'use client'

import { AlertTriangle, RotateCcw, Zap } from 'lucide-react'

/**
 * Friendly fallback when WebGL context is lost (Chrome reclaimed it
 * because too many tabs/windows of the app are open, or the GPU went to
 * sleep). Two actions:
 *
 *   - Restart 3D — soft retry via WEBGL_lose_context.restoreContext().
 *     No page reload, no state loss. Usually works.
 *   - Reload page — hard reload, last resort.
 */
export function WebGLContextLossOverlay({
  onReload,
  onRestart,
}: {
  onReload: () => void
  onRestart?: () => void
}) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-zinc-950/95 backdrop-blur">
      <div className="max-w-sm text-center px-6 py-5 rounded-xl border border-amber-500/40 bg-amber-500/10">
        <AlertTriangle className="size-6 text-amber-300 mx-auto mb-2" />
        <h3 className="text-sm font-medium text-zinc-100 mb-1">3D viewport disconnected</h3>
        <p className="text-xs text-zinc-400 leading-relaxed mb-4">
          The browser reclaimed this WebGL context. Try restarting it in place — if that
          doesn&apos;t work, reload the page. (Closing other tabs of the app helps too.)
        </p>
        <div className="flex gap-2 justify-center">
          {onRestart && (
            <button
              type="button"
              onClick={onRestart}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 rounded-md transition-colors"
            >
              <Zap className="size-3.5" />
              Restart 3D
            </button>
          )}
          <button
            type="button"
            onClick={onReload}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 rounded-md transition-colors"
          >
            <RotateCcw className="size-3.5" />
            Reload page
          </button>
        </div>
      </div>
    </div>
  )
}
