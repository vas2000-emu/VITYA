import type { MoldAnalysisResult } from '@/lib/types'

// ---------------------------------------------------------------------------
// Mock analysis data for the MoldLocal results dashboard.
//
// This file stands in for the future backend response. When the CAD parsing /
// AI suggestions / supplier-readiness pipeline lands, replace this with a
// real fetch and feed the response through `adaptBackendResponse` from
// `lib/backendAdapter.ts` (which maps the backend JSON shape into the
// `MoldAnalysisResult` shape consumed by the dashboard components).
//
// Hotspot `top` / `left` percentages are positioned over the part-preview
// SVG in `components/results/PartPreview.tsx`. The backend should send
// equivalent `x` / `y` percentages — the adapter handles the conversion.
// ---------------------------------------------------------------------------

export const moldAnalysisData: MoldAnalysisResult = {
  partName: 'Sample Plastic Bracket',
  overallScore: 56,
  improvedScore: 82,
  riskSummary: [
    {
      label: 'Michigan readiness',
      value: '56/100',
      description: 'Local molders prefer simpler geometry and proven tooling.',
    },
    {
      label: 'Moldability',
      value: '62/100',
      description: 'Current design has undercut, draft, and thin-wall concerns.',
    },
    {
      label: 'Cost risk',
      value: 'High',
      description: 'Complex tooling features will increase quote and tooling investment.',
    },
    {
      label: 'Lead time',
      value: 'Moderate',
      description: 'Additional mold design iterations may extend delivery.',
    },
  ],
  issues: [
    {
      id: 'undercut-1',
      title: 'Undercut detected',
      severity: 'high',
      location: 'snap-fit hook',
      whyItMatters:
        'Undercuts may require side actions or more complex tooling to release the part cleanly.',
      costImpact: 'Higher tooling cost and longer mold build time.',
      leadTimeImpact: 'Extended design cycle for side-actions and mold validation.',
      recommendation: 'Redesign the hook, add draft, or simplify the geometry.',
      scoreImpact: '+26',
      beforeScore: 56,
      afterScore: 82,
      hotspot: {
        top: '47%',
        left: '74%',
        label: 'Undercut',
      },
    },
    {
      id: 'draft-1',
      title: 'Missing draft angle',
      severity: 'medium',
      location: 'vertical wall faces',
      whyItMatters:
        'Insufficient draft makes part removal harder and can damage the molded surface.',
      costImpact: 'May require rework of mold faces and increase rejection rate.',
      leadTimeImpact: 'Slower cycle time and additional mold tuning iterations.',
      recommendation: 'Add 3° or more draft to the vertical walls for reliable ejection.',
      scoreImpact: '+18',
      beforeScore: 56,
      afterScore: 74,
      hotspot: {
        top: '40%',
        left: '40%',
        label: 'Draft',
      },
    },
    {
      id: 'thin-wall-1',
      title: 'Thin wall risk',
      severity: 'medium',
      location: 'side walls',
      whyItMatters:
        'Thin walls can create sink marks, short shots, and inconsistent fill patterns.',
      costImpact: 'May require process tuning or thicker material, increasing cycle cost.',
      leadTimeImpact: 'Additional validation and slower cooling time.',
      recommendation: 'Increase wall thickness to a consistent 2.5–3.0mm section.',
      scoreImpact: '+14',
      beforeScore: 56,
      afterScore: 70,
      hotspot: {
        top: '68%',
        left: '22%',
        label: 'Thin wall',
      },
    },
  ],
  supplierReadiness: {
    region: 'Michigan',
    status: 'Needs improvement',
    notes: 'Simpler tooling would make this part easier for local molders to quote quickly.',
  },
  checklist: [
    {
      id: 'check-1',
      label: 'Undercut / side action risk reviewed',
      status: 'attention',
    },
    {
      id: 'check-2',
      label: 'Draft angles meet local injection molding standards',
      status: 'action',
    },
    {
      id: 'check-3',
      label: 'Wall thickness is consistent across feature areas',
      status: 'action',
    },
    {
      id: 'check-4',
      label: 'Supplier notes aligned with Michigan molder capabilities',
      status: 'good',
    },
  ],
}
