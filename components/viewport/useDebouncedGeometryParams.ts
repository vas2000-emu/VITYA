'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { DEFAULT_GEOMETRY_PARAMS, type GeometryParams } from './partGeometry'

/**
 * Reads the design-parameter values (height, wall thickness, draft) out
 * of useAppStore and surfaces them as a debounced GeometryParams object
 * for the viewport to rebuild on. Debounce prevents the procedural mesh
 * from being regenerated on every keystroke while typing in the
 * numeric input.
 *
 * Source-of-truth for the IDs is store/useAppStore.ts initialParameters
 * — keep these strings aligned.
 */
const HEIGHT_BASELINE = 40

export function useDebouncedGeometryParams(delayMs = 200): GeometryParams {
  const parameters = useAppStore((s) => s.parameters)
  const minDraft = useAppStore((s) => s.simulationParams.minDraftAngle)
  const wallThickness = useAppStore((s) => s.simulationParams.wallThickness)

  const heightParam = parameters.find((p) => p.id === 'p-height')?.value
  const draftParam = parameters.find((p) => p.id === 'p-draft')?.value ?? minDraft
  const wallParam = parameters.find((p) => p.id === 'p-wall')?.value ?? wallThickness

  const target: GeometryParams = {
    heightScale: heightParam ? Math.max(0.25, heightParam / HEIGHT_BASELINE) : DEFAULT_GEOMETRY_PARAMS.heightScale,
    wallThickness: wallParam,
    draftDeg: draftParam,
  }

  const [debounced, setDebounced] = useState<GeometryParams>(target)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(target), delayMs)
    return () => clearTimeout(t)
  }, [target.heightScale, target.wallThickness, target.draftDeg, delayMs])

  return debounced
}
