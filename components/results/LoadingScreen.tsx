'use client'

import { useEffect, useRef, useState } from 'react'
import { Cpu, Loader2, Terminal } from 'lucide-react'
import { useResultsStore, LOADING_PHASE_LABELS } from '@/store/useResultsStore'

// Pre-baked "log lines" that stream in as each phase becomes active.
// Pure cosmetic — sells the "real work is happening" story.
const PHASE_LOGS: Record<string, string[]> = {
  'Parsing geometry…': [
    '> Loading STEP / STL geometry',
    '> 14,237 triangles, 7,121 vertices',
    '> Bounding box: 120.00 x 90.00 x 60.00 mm',
  ],
  'Computing surface normals…': [
    '> Smoothing crease angles > 30°',
    '> 14,237 face normals computed',
  ],
  'Sampling wall thickness…': [
    '> BVH built (depth=18, 14237 leaves)',
    '> Wall thickness range: 1.2 mm – 4.1 mm',
    '> 134 thin-wall warnings (< 2.0 mm)',
  ],
  'Detecting undercuts…': [
    '> Pull direction: +Z',
    '> Silhouette test: 1 undercut found',
    '> Affected region: snap-fit hook',
  ],
  'Estimating cost via Michigan ABS norms…': [
    '> Material: ABS, virgin',
    '> Run size: 10,000 pcs',
    '> Tooling: 1-cavity steel + 1 side action',
    '> Per-part est.: $1.42',
  ],
  'Querying supplier readiness…': [
    '> Region: Michigan, USA',
    '> 3 candidate shops within 150 mi',
    '> Best lead time: 4 weeks (Great Lakes Plastics)',
  ],
  'Compiling report…': [
    '> Building issue panel data',
    '> Done.',
  ],
}

export function LoadingScreen() {
  const loadingPhase = useResultsStore((s) => s.loadingPhase)
  const currentIndex = Math.max(
    0,
    (LOADING_PHASE_LABELS as readonly string[]).indexOf(loadingPhase),
  )

  return (
    <div className="min-h-[calc(100vh-49px)] flex items-center justify-center bg-zinc-950 px-6">
      <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-[1fr_1.2fr] gap-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
          <div className="flex items-center gap-3 mb-6">
            <span className="size-10 rounded-md bg-blue-500/15 border border-blue-500/40 flex items-center justify-center">
              <Cpu className="size-5 text-blue-300" />
            </span>
            <div>
              <h2 className="text-sm font-medium text-zinc-100">Analyzing part</h2>
              <p className="text-xs text-zinc-500">Checking moldability + finding local shops</p>
            </div>
          </div>

          <ul className="space-y-2">
            {LOADING_PHASE_LABELS.map((phase, i) => {
              const isDone = currentIndex > i
              const isActive = currentIndex === i
              let textCls = 'text-zinc-600'
              if (isDone) textCls = 'text-emerald-300'
              else if (isActive) textCls = 'text-zinc-100'
              return (
                <li
                  key={phase}
                  className={`flex items-center gap-3 text-sm transition-colors ${textCls}`}
                >
                  <span className="size-5 flex items-center justify-center shrink-0">
                    {isDone && <span className="size-2 rounded-full bg-emerald-400" />}
                    {isActive && <Loader2 className="size-4 animate-spin text-blue-400" />}
                    {!isDone && !isActive && <span className="size-2 rounded-full bg-zinc-700" />}
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
                width: `${((currentIndex + 1) / LOADING_PHASE_LABELS.length) * 100}%`,
              }}
            />
          </div>
        </div>

        <LogStream phaseLabel={loadingPhase} phaseIndex={currentIndex} />
      </div>
    </div>
  )
}

/**
 * Right-hand "log stream" pane. As each loading phase becomes active,
 * the pre-baked log lines for that phase typewriter in at ~28ms/char.
 * Old phases stay visible, scroll auto-pinned to the bottom.
 */
function LogStream({
  phaseLabel,
  phaseIndex,
}: {
  phaseLabel: string
  phaseIndex: number
}) {
  const [lines, setLines] = useState<string[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastPhaseRef = useRef<number>(-1)

  useEffect(() => {
    if (lastPhaseRef.current === phaseIndex) return
    lastPhaseRef.current = phaseIndex

    const phaseLogs = PHASE_LOGS[phaseLabel] ?? []
    if (phaseLogs.length === 0) return

    let cancelled = false
    let lineIdx = 0
    let charIdx = 0
    let typingNewLine = true

    const tick = () => {
      if (cancelled) return
      const target = phaseLogs[lineIdx]
      if (target === undefined) return

      charIdx += 1
      const partial = target.slice(0, charIdx)
      setLines((prev) => {
        if (typingNewLine) {
          typingNewLine = false
          return [...prev, partial]
        }
        const next = [...prev]
        next[next.length - 1] = partial
        return next
      })

      if (charIdx >= target.length) {
        lineIdx += 1
        charIdx = 0
        typingNewLine = true
        if (lineIdx < phaseLogs.length) setTimeout(tick, 90)
      } else {
        setTimeout(tick, 28)
      }
    }
    tick()

    return () => {
      cancelled = true
    }
  }, [phaseIndex, phaseLabel])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [lines])

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 flex flex-col min-h-[260px]">
      <div className="flex items-center gap-2 mb-3 text-xs text-zinc-500">
        <Terminal className="size-3.5" />
        analysis.log
      </div>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto font-mono text-[11px] leading-relaxed text-emerald-300/90 whitespace-pre"
      >
        {lines.map((line, i) => (
          <div key={`${i}-${line.slice(0, 8)}`}>{line}</div>
        ))}
        <span className="inline-block w-1.5 h-3 bg-emerald-400 animate-pulse align-middle ml-0.5" />
      </div>
    </div>
  )
}
