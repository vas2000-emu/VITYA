'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { getPartSimInputs } from '@/lib/partSimInputs'
import type { PartId } from '@/lib/types'
import { DEFAULT_GEOMETRY_PARAMS, type GeometryParams } from './partGeometry'

/**
 * Reads the live design-parameter values out of useAppStore and surfaces
 * them as a debounced GeometryParams object for the viewport to rebuild
 * on. Debounce prevents the procedural mesh from being regenerated on
 * every keystroke while typing in the numeric input.
 *
 * Source-of-truth for the IDs is store/useAppStore.ts initialParameters
 * — keep these strings aligned.
 *
 * Length / width / height scales are computed against the current
 * part's baseline dimensions in lib/partSimInputs.ts. Switching parts
 * resets the panel values to the new baseline, which yields scale = 1
 * (no distortion) until the user edits.
 */
const SCALE_FLOOR = 0.1
const SCALE_CEILING = 4

function clampScale(v: number): number {
  if (!Number.isFinite(v) || v <= 0) return 1
  return Math.min(SCALE_CEILING, Math.max(SCALE_FLOOR, v))
}

export function useDebouncedGeometryParams(delayMs = 200): GeometryParams {
  const parameters = useAppStore((s) => s.parameters)
  const minDraft = useAppStore((s) => s.simulationParams.minDraftAngle)
  const wallThickness = useAppStore((s) => s.simulationParams.wallThickness)
  const currentPartId = useAppStore((s) => s.currentPartId)
  const customPartSpec = useAppStore((s) => s.customPartSpec)

  // For demo parts the baseline comes from the static partSimInputs table.
  // For 'custom' parts the AI-emitted spec IS the baseline — buildCustomGeometry
  // bakes the spec's L/W/H into the mesh, so scale stays at 1.0 until the
  // user edits the Parameters panel.
  const baseline =
    currentPartId === 'custom' && customPartSpec
      ? {
          part_length: customPartSpec.partLength,
          part_width: customPartSpec.partWidth,
          part_height: customPartSpec.partHeight,
        }
      : getPartSimInputs(currentPartId as PartId)
  const lenParam = parameters.find((p) => p.id === 'p-len')?.value
  const widParam = parameters.find((p) => p.id === 'p-wid')?.value
  const heightParam = parameters.find((p) => p.id === 'p-height')?.value
  const draftParam = parameters.find((p) => p.id === 'p-draft')?.value ?? minDraft
  const wallParam = parameters.find((p) => p.id === 'p-wall')?.value ?? wallThickness

  const target: GeometryParams = {
    lengthScale:
      baseline && lenParam
        ? clampScale(lenParam / baseline.part_length)
        : DEFAULT_GEOMETRY_PARAMS.lengthScale,
    heightScale:
      baseline && heightParam
        ? clampScale(heightParam / baseline.part_height)
        : DEFAULT_GEOMETRY_PARAMS.heightScale,
    widthScale:
      baseline && widParam
        ? clampScale(widParam / baseline.part_width)
        : DEFAULT_GEOMETRY_PARAMS.widthScale,
    wallThickness: wallParam,
    draftDeg: draftParam,
  }

  const [debounced, setDebounced] = useState<GeometryParams>(target)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(target), delayMs)
    return () => clearTimeout(t)
  }, [
    target.lengthScale,
    target.heightScale,
    target.widthScale,
    target.wallThickness,
    target.draftDeg,
    delayMs,
  ])

  return debounced
}
