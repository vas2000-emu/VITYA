'use client'

import { Cpu, Loader2 } from 'lucide-react'
import { useResultsStore, LOADING_PHASES } from '@/store/useResultsStore'

export function LoadingScreen() {
  const { loadingPhase } = useResultsStore()
  const currentIndex = Math.max(
    0,
    (LOADING_PHASES as readonly string[]).indexOf(loadingPhase),
  )

  return (
    <div className="min-h-[calc(100vh-49px)] flex items-center justify-center bg-zinc-950 px-6">
      <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="size-10 rounded-md bg-blue-500/15 border border-blue-500/40 flex items-center justify-center">
            <Cpu className="size-5 text-blue-300" />
          </span>
          <div>
            <h2 className="text-sm font-medium text-zinc-100">Analyzing part</h2>
            <p className="text-xs text-zinc-500">This usually takes a few seconds</p>
          </div>
        </div>

        <ul className="space-y-2">
          {LOADING_PHASES.map((phase, i) => {
            const isDone = currentIndex > i
            const isActive = currentIndex === i
            return (
              <li
                key={phase}
                className={`flex items-center gap-3 text-sm transition-colors ${
                  isDone
                    ? 'text-emerald-300'
                    : isActive
                    ? 'text-zinc-100'
                    : 'text-zinc-600'
                }`}
              >
                <span className="size-5 flex items-center justify-center shrink-0">
                  {isDone ? (
                    <span className="size-2 rounded-full bg-emerald-400" />
                  ) : isActive ? (
                    <Loader2 className="size-4 animate-spin text-blue-400" />
                  ) : (
                    <span className="size-2 rounded-full bg-zinc-700" />
                  )}
                </span>
                <span>{phase}</span>
              </li>
            )
          })}
        </ul>

        <div className="mt-6 h-1 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-[width] duration-500 ease-out"
            style={{
              width: `${((currentIndex + 1) / LOADING_PHASES.length) * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  )
}
