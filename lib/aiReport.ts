import type { FullAnalysisResponse } from '@/lib/moldsim-api'
import type { MoldAnalysisResult, MoldIssue } from '@/lib/types'

/** Build a synthetic MoldAnalysisResult for a custom part (AI-created
 *  or STL-uploaded) by calling /api/ai/generate-report and merging the
 *  AI-emitted issues with simulator-derived scores. Returns null on
 *  failure so the caller can fall back to "no rich-text yet" state. */
export async function generateCustomPartReport(input: {
  partId: string
  partName: string
  partDescription?: string
  material: string
  partLength: number
  partWidth: number
  partHeight: number
  wallThickness: number
  minDraftAngle: number
  results: FullAnalysisResponse
}): Promise<MoldAnalysisResult | null> {
  try {
    const {
      partId,
      partName,
      partDescription,
      material,
      partLength,
      partWidth,
      partHeight,
      wallThickness,
      minDraftAngle,
      results,
    } = input
    const dfmScore = Math.round(results.manufacturing.overall_score)
    const res = await fetch('/api/ai/generate-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partName,
        partDescription,
        material,
        partLength,
        partWidth,
        partHeight,
        wallThickness,
        minDraftAngle,
        dfmScore,
        cycleTimeSec: results.cooling.cycle_time,
        perPartCost: results.cost.total_cost_per_part,
        toolingCost: results.cost.total_tooling_cost,
        isManufacturable: results.manufacturing.is_manufacturable,
        rawIssues: results.manufacturing.issues,
      }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { issues?: MoldIssue[] }
    if (!data.issues || data.issues.length === 0) return null

    const improvedScore = data.issues.reduce(
      (sum, i) => sum + (Number.parseInt(i.scoreImpact.replace('+', '')) || 0),
      dfmScore,
    )

    return {
      partId,
      partName,
      partSummary:
        partDescription ??
        `${material} part, ${partLength.toFixed(0)} x ${partWidth.toFixed(0)} x ${partHeight.toFixed(0)} mm`,
      overallScore: dfmScore,
      improvedScore: Math.min(100, improvedScore),
      riskSummary: [
        {
          label: 'Moldability score',
          value: `${dfmScore}/100`,
          description: results.manufacturing.is_manufacturable
            ? 'The part meets the basic checks. Apply the suggested fixes to bump the score.'
            : 'The simulator flagged risks that need fixing before a shop will accept this file.',
        },
        {
          label: 'Cycle time',
          value: `${results.cooling.cycle_time.toFixed(1)} s`,
          description: 'Time per part once the mold is running.',
        },
        {
          label: 'Per-part cost',
          value: `$${results.cost.total_cost_per_part.toFixed(2)}`,
          description: `Material + cycle + labor + amortized tooling.`,
        },
      ],
      issues: data.issues,
      supplierReadiness: {
        region: 'Michigan',
        status: dfmScore >= 70 ? 'Design-ready' : 'Needs design refinement',
        notes:
          dfmScore >= 70
            ? 'Open the Local Manufacturing tab to see which shops will accept this file as-is.'
            : 'Apply the fixes above first — shops in the directory have a minimum 60 score requirement.',
      },
      checklist: [
        { id: 'c-1', label: 'Material confirmed', status: 'good' },
        {
          id: 'c-2',
          label: 'Wall thickness within range',
          status: wallThickness >= 1 && wallThickness <= 5 ? 'good' : 'attention',
        },
        {
          id: 'c-3',
          label: 'Draft angle adequate',
          status: minDraftAngle >= 1.5 ? 'good' : 'attention',
        },
      ],
    }
  } catch {
    return null
  }
}
