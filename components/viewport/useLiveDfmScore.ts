'use client'

import { useMemo } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { checkManufacturability } from '@/lib/moldsim/manufacturing'

/**
 * Synchronous DFM score derived from the current simulationParams. The
 * underlying checkManufacturability() is a pure function (no network),
 * so it can be called on every render. The Manufacturing panel still
 * fires the full `/api/moldsim` round-trip for the authoritative
 * report — this is the at-a-glance number that updates live as a
 * slider moves.
 */
export function useLiveDfmScore(): {
  score: number
  issueCount: number
  worstSeverity: 'critical' | 'warning' | 'info' | null
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
    })

    const sevOrder: Array<'critical' | 'warning' | 'info'> = ['critical', 'warning', 'info']
    let worst: 'critical' | 'warning' | 'info' | null = null
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
  ])
}
