'use client'

import { Activity, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useLiveDfmScore } from './useLiveDfmScore'

/**
 * Bottom-left HUD pill showing the live DFM score and the design
 * parameters that produced it. Updates instantly on every parameter
 * edit (the underlying scoring is sync — see useLiveDfmScore).
 */
export function SimulationStatusHud() {
  const sp = useAppStore((s) => s.simulationParams)
  const { score, issueCount, worstSeverity } = useLiveDfmScore()

  const tone =
    score >= 80
      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
      : score >= 60
        ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
        : 'border-rose-500/40 bg-rose-500/10 text-rose-200'

  const IconEl =
    worstSeverity === 'critical'
      ? AlertTriangle
      : worstSeverity === 'warning'
        ? Activity
        : CheckCircle2

  return (
    <div className="absolute bottom-4 left-4 z-10 flex items-stretch gap-2">
      <div className={`flex items-center gap-2 px-3 py-2 text-xs rounded-lg border backdrop-blur ${tone}`}>
        <IconEl className="size-4" />
        <div>
          <div className="font-mono text-sm leading-none">{score}</div>
          <div className="text-[10px] uppercase tracking-wider opacity-80 leading-tight">
            DFM score · {issueCount} issue{issueCount === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 px-3 py-2 text-[11px] rounded-lg border border-zinc-800 bg-zinc-900/85 backdrop-blur text-zinc-300">
        <StatBit label="Wall" value={`${(sp.wallThickness / 25.4).toFixed(3)} in`} />
        <StatBit label="Draft" value={`${sp.minDraftAngle.toFixed(1)}°`} />
        <StatBit label="Material" value={sp.material} />
        <StatBit label="Cavities" value={`${sp.numCavities}`} />
      </div>
    </div>
  )
}

function StatBit({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex flex-col items-start leading-tight">
      <span className="text-zinc-500 text-[9px] uppercase tracking-wider">{label}</span>
      <span className="font-mono text-zinc-100">{value}</span>
    </span>
  )
}
