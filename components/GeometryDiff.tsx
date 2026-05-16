'use client'

import { GitCompare, X } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

export function GeometryDiff() {
  const { showDiff, setShowDiff } = useAppStore()

  if (!showDiff) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg w-[90%] max-w-5xl h-[80%] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <GitCompare className="size-5" />
            <h2 className="font-medium">Geometry Comparison</h2>
          </div>
          <button
            onClick={() => setShowDiff(false)}
            className="p-1 hover:bg-zinc-800 rounded"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 flex">
          <div className="flex-1 border-r border-zinc-800 flex flex-col">
            <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-950/50">
              <div className="text-sm font-medium">Before</div>
              <div className="text-xs text-zinc-500">Current geometry</div>
            </div>
            <div className="flex-1 relative bg-zinc-950">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-48 h-48 mx-auto bg-zinc-800/50 rounded-lg flex items-center justify-center mb-3">
                    <div className="w-32 h-32 border-4 border-zinc-600 rounded-lg relative">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full border-4 border-zinc-600 bg-zinc-950" />
                    </div>
                  </div>
                  <div className="text-sm text-zinc-400">7 features</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-950/50">
              <div className="text-sm font-medium">After</div>
              <div className="text-xs text-zinc-500">With AI suggestions applied</div>
            </div>
            <div className="flex-1 relative bg-zinc-950">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-48 h-48 mx-auto bg-zinc-800/50 rounded-lg flex items-center justify-center mb-3 relative">
                    <div className="w-32 h-32 border-4 border-green-500/50 rounded-xl relative shadow-lg shadow-green-500/20">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full border-4 border-green-500/50 bg-zinc-950" />
                    </div>
                    <div className="absolute top-2 right-2 px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                      Modified
                    </div>
                  </div>
                  <div className="text-sm text-zinc-400">9 features (+2)</div>
                </div>
              </div>

              <div className="absolute bottom-4 right-4 left-4 bg-zinc-800/90 border border-zinc-700 rounded-lg p-3">
                <div className="text-xs font-medium mb-2">Changes:</div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">+</span>
                    <span className="text-zinc-300">Fillet 2 (4 edges, r=2mm)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-400">~</span>
                    <span className="text-zinc-300">Extrude 1 depth: 25mm → 30mm</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-400">~</span>
                    <span className="text-zinc-300">Wall thickness: 1.5mm → 2.5mm</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800 bg-zinc-950/50">
          <div className="text-sm text-zinc-400">
            <span className="text-green-400">+2 added</span>
            <span className="mx-2">•</span>
            <span className="text-blue-400">~2 modified</span>
          </div>
          <button
            onClick={() => setShowDiff(false)}
            className="px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
