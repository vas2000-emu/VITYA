'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Tween a numeric value toward `target` over `durationMs` using rAF.
 * Returns the in-between value each frame. Cancels cleanly on unmount
 * or when target/duration change mid-tween.
 *
 * Used by ScoreOverview / ScoreImprovement / PartsSidebar so that when
 * applyFix() bumps the score, the user sees it climb instead of jumping.
 */
export function useAnimatedNumber(target: number, durationMs = 700): number {
  const [value, setValue] = useState(target)
  const startVal = useRef(target)
  const startTime = useRef(0)
  const rafId = useRef<number | null>(null)

  useEffect(() => {
    startVal.current = value
    startTime.current = performance.now()

    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime.current) / durationMs)
      // ease-out cubic
      const k = 1 - Math.pow(1 - t, 3)
      const next = startVal.current + (target - startVal.current) * k
      setValue(next)
      if (t < 1) {
        rafId.current = requestAnimationFrame(tick)
      } else {
        rafId.current = null
      }
    }

    rafId.current = requestAnimationFrame(tick)
    return () => {
      if (rafId.current !== null) cancelAnimationFrame(rafId.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs])

  return value
}
