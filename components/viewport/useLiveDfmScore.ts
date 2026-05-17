'use client'

import { useMemo } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { checkManufacturability } from '@/lib/moldsim/manufacturing'
import type { ManufacturingCheckResponse } from '@/lib/moldsim/types'

export type LiveDfmSeverity = 'critical' | 'warning' | 'info'

/**
 * Synchronous DFM score + issues derived from the current
 * simulationParams. checkManufacturability() is a pure function (no
 * network) so we can call it on every render — the HUD pill, the
 * Manufacturing panel, and anything else that needs an at-a-glance
 * score consume this so every surface stays in lockstep with the
 * Parameters / Simulation Settings panels.
 *
 * The Manufacturing panel still has a "Re-run Analysis" button — that
 * one fires the cost / cooling / filling round-trips (which DO need
 * the API). DFM is local.
 */
export function useLiveDfmScore(): {
  score: number
  issueCount: number
  worstSeverity: LiveDfmSeverity | null
  issues: ManufacturingCheckResponse['issues']
  summary: string
} {
  const sp = useAppStore((s) => s.simulationParams)

  return useMemo(() => {
    const res = checkManufacturability({
      wall_thickness: sp.wallThickness,
      min_draft_angle: sp.minDraftAngle,
      num_undercuts: sp.numUndercuts,
      material: sp.material,
      has_sharp_corners: sp.hasSharpCorners,
      has_uniform_wall: sp.hasUniformWall,
      part_length: sp.partLength,
      part_width: sp.partWidth,
      part_height: sp.partHeight,
    })

    const sevOrder: LiveDfmSeverity[] = ['critical', 'warning', 'info']
    let worst: LiveDfmSeverity | null = null
    for (const sev of sevOrder) {
      if (res.issues.some((i) => i.severity === sev)) {
        worst = sev
        break
      }
    }

    return {
      score: res.overall_score,
      issueCount: res.issues.length,
      worstSeverity: worst,
      issues: res.issues,
      summary: res.summary,
    }
  }, [
    sp.wallThickness,
    sp.minDraftAngle,
    sp.numUndercuts,
    sp.material,
    sp.hasSharpCorners,
    sp.hasUniformWall,
    sp.partLength,
    sp.partWidth,
    sp.partHeight,
  ])
}
