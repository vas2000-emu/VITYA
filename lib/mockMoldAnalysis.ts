import type { MoldAnalysisResult, PartId } from '@/lib/types'

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

const bracket: MoldAnalysisResult = {
  partId: 'bracket',
  partName: 'Sample Plastic Bracket',
  partSummary: 'L-bracket with mounting holes and a snap-fit hook.',
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
      hotspot: { top: '47%', left: '74%', label: 'Undercut' },
      region: { min: [-52, 18, -16], max: [-36, 30, 16] }, // snap-fit hook box
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
      hotspot: { top: '40%', left: '40%', label: 'Draft' },
      region: { min: [-62, -14, -46], max: [-46, 34, 46] }, // vertical wall
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
      hotspot: { top: '68%', left: '22%', label: 'Thin wall' },
      region: { min: [-21, -10, -8], max: [-9, 14, 8] }, // rib region
    },
  ],
  supplierReadiness: {
    region: 'Michigan',
    status: 'Needs improvement',
    notes: 'Simpler tooling would make this part easier for local molders to quote quickly.',
  },
  checklist: [
    { id: 'check-1', label: 'Undercut / side action risk reviewed', status: 'attention' },
    { id: 'check-2', label: 'Draft angles meet local injection molding standards', status: 'action' },
    { id: 'check-3', label: 'Wall thickness is consistent across feature areas', status: 'action' },
    { id: 'check-4', label: 'Supplier notes aligned with Michigan molder capabilities', status: 'good' },
  ],
}

const phoneCase: MoldAnalysisResult = {
  partId: 'phoneCase',
  partName: 'Consumer Phone Case Back',
  partSummary: 'Thin-walled rounded shell for a 6.1" phone, ABS / PC blend.',
  overallScore: 71,
  improvedScore: 89,
  riskSummary: [
    {
      label: 'Michigan readiness',
      value: '71/100',
      description: 'Consumer-electronics-friendly shops can quote this quickly.',
    },
    {
      label: 'Moldability',
      value: '74/100',
      description: 'Thin walls and tight corners drive sink and warpage risk.',
    },
    {
      label: 'Cost risk',
      value: 'Medium',
      description: 'High-cavity tool is investment-heavy but per-part cost is low at volume.',
    },
    {
      label: 'Lead time',
      value: 'Short',
      description: 'Stock electronics tooling cuts mold build to ~5 weeks.',
    },
  ],
  issues: [
    {
      id: 'sink-1',
      title: 'Sink-mark risk on side wall',
      severity: 'medium',
      location: 'long side walls',
      whyItMatters: 'Thin walls over a long span sink as the part cools, leaving cosmetic dimples.',
      costImpact: 'Cosmetic rejects raise scrap rate ~3–5% on first runs.',
      leadTimeImpact: 'Tuning cycle time and packing pressure adds ~3 days of mold sampling.',
      recommendation: 'Bump wall thickness on the long span from 1.4mm to 1.8mm.',
      scoreImpact: '+10',
      beforeScore: 71,
      afterScore: 81,
      hotspot: { top: '52%', left: '32%', label: 'Sink risk' },
    },
    {
      id: 'corner-1',
      title: 'Sharp inside corners concentrate stress',
      severity: 'medium',
      location: 'corner radii',
      whyItMatters: 'Sharp inside corners create stress risers and weaken the snap behavior.',
      costImpact: 'Field-failure returns are the real cost — minimal tooling impact.',
      leadTimeImpact: 'None.',
      recommendation: 'Add a minimum 0.5mm fillet to every inside corner.',
      scoreImpact: '+8',
      beforeScore: 71,
      afterScore: 79,
      hotspot: { top: '20%', left: '20%', label: 'Sharp corner' },
    },
  ],
  supplierReadiness: {
    region: 'Michigan',
    status: 'Ready to quote',
    notes: 'Detroit-area electronics molders quote consumer cases in 1–2 days.',
  },
  checklist: [
    { id: 'check-1', label: 'Wall thickness consistent on long span', status: 'attention' },
    { id: 'check-2', label: 'Inside corner radii ≥ 0.5mm', status: 'attention' },
    { id: 'check-3', label: 'Color masterbatch + finish (SPI A-2) confirmed', status: 'good' },
    { id: 'check-4', label: 'Tooling cavity count matches launch volume', status: 'good' },
  ],
}

const droneArm: MoldAnalysisResult = {
  partId: 'droneArm',
  partName: 'Quadcopter Drone Arm',
  partSummary: 'Cantilevered arm carrying a brushless motor at the tip.',
  overallScore: 48,
  improvedScore: 76,
  riskSummary: [
    {
      label: 'Michigan readiness',
      value: '48/100',
      description: 'Glass-filled nylon shops are scarcer than standard ABS molders.',
    },
    {
      label: 'Moldability',
      value: '55/100',
      description: 'Long thin arm + concentrated motor mount = ejection + warp risk.',
    },
    {
      label: 'Cost risk',
      value: 'High',
      description: 'Glass fiber abrades tooling faster, raising maintenance cost.',
    },
    {
      label: 'Lead time',
      value: 'Long',
      description: 'Mold flow analysis and hardened-steel tool extend timeline to ~8 weeks.',
    },
  ],
  issues: [
    {
      id: 'warpage-1',
      title: 'Warpage risk from long thin span',
      severity: 'high',
      location: 'arm midspan',
      whyItMatters: 'Differential cooling across a long thin span causes the arm to bow.',
      costImpact: 'Flatness rejects can run 8–12% without process tuning.',
      leadTimeImpact: 'Mold flow analysis adds ~1 week to design phase.',
      recommendation: 'Add stiffening ribs along the underside or thicken cross-section by 0.5mm.',
      scoreImpact: '+15',
      beforeScore: 48,
      afterScore: 63,
      hotspot: { top: '52%', left: '50%', label: 'Warpage' },
    },
    {
      id: 'gate-1',
      title: 'Gate location TBD',
      severity: 'medium',
      location: 'mounting boss',
      whyItMatters: 'Gate near the motor mount leaves a witness mark and weld lines across the arm.',
      costImpact: 'Aesthetic + structural — wrong gate placement reduces strength ~15%.',
      leadTimeImpact: 'Resolving with mold flow adds ~3 days.',
      recommendation: 'Move gate to the body-end of the arm; validate with simulation.',
      scoreImpact: '+8',
      beforeScore: 48,
      afterScore: 56,
      hotspot: { top: '40%', left: '24%', label: 'Gate' },
    },
    {
      id: 'wear-1',
      title: 'Glass-fiber tool wear',
      severity: 'low',
      location: 'shutoff faces',
      whyItMatters: 'Glass-filled nylon abrades softer tool steels at the parting line.',
      costImpact: 'Maintenance reblues / inserts every ~50K cycles.',
      leadTimeImpact: 'Negligible on first run.',
      recommendation: 'Specify H13 hardened tool steel at the parting line and gates.',
      scoreImpact: '+5',
      beforeScore: 48,
      afterScore: 53,
      hotspot: { top: '60%', left: '78%', label: 'Tool wear' },
    },
  ],
  supplierReadiness: {
    region: 'Michigan',
    status: 'Specialty supplier required',
    notes: 'Lakeshore IM in Holland handles glass-filled nylon at this volume.',
  },
  checklist: [
    { id: 'check-1', label: 'Stiffener ribs added to midspan', status: 'action' },
    { id: 'check-2', label: 'Gate location validated via mold flow', status: 'action' },
    { id: 'check-3', label: 'Tool steel hardness specified (≥ H13)', status: 'attention' },
    { id: 'check-4', label: 'Glass-filled nylon supplier confirmed', status: 'good' },
  ],
}

const bumper: MoldAnalysisResult = {
  partId: 'bumper',
  partName: 'Automotive Front Bumper Fascia',
  partSummary: 'Cosmetic front fascia for a passenger vehicle, polypropylene, 1.7m wide with integrated fog-light bezels.',
  overallScore: 42,
  improvedScore: 71,
  riskSummary: [
    {
      label: 'Michigan readiness',
      value: '42/100',
      description: 'Only tier-1 automotive molders can handle a tool this size locally.',
    },
    {
      label: 'Moldability',
      value: '48/100',
      description: 'Long flow path + thin cosmetic sections drive knit-line and sink risk.',
    },
    {
      label: 'Cost risk',
      value: 'High',
      description: 'Hardened multi-cavity tool + side actions for sensor mounts dominate cost.',
    },
    {
      label: 'Lead time',
      value: 'Long',
      description: 'Mold flow validation, tool build, and PPAP add 14-18 weeks before SOP.',
    },
  ],
  issues: [
    {
      id: 'knit-line-1',
      title: 'Knit lines around fog light openings',
      severity: 'high',
      location: 'fog-light bezel pockets',
      whyItMatters:
        'Flow fronts meeting behind the openings produce visible cosmetic lines on the painted surface.',
      costImpact: 'Cosmetic rejects at paint inspection; second-stage rework adds ~$0.40/part.',
      leadTimeImpact: 'Mold flow simulation + gate re-balancing adds 1-2 weeks to design.',
      recommendation: 'Add a hot-tip gate near each fog opening or relocate runners for balanced fill.',
      scoreImpact: '+12',
      beforeScore: 42,
      afterScore: 54,
      hotspot: { top: '58%', left: '22%', label: 'Knit' },
      region: { min: [-95, -8, -6], max: [-65, 6, 12] },
    },
    {
      id: 'sink-bumper-1',
      title: 'Sink risk on long upper span',
      severity: 'high',
      location: 'top horizontal beam',
      whyItMatters:
        'Thin 2.5mm wall over a 1.4m unsupported span sinks visibly during cooling; pulls bumper surface inward.',
      costImpact: 'Reject rate climbs to ~6% on first run without packing tuning.',
      leadTimeImpact: 'Cycle time +15% during packing optimization; tool sampling extends one week.',
      recommendation: 'Bump top-span wall to 3.0mm OR add internal ribs on the back face every ~200mm.',
      scoreImpact: '+10',
      beforeScore: 42,
      afterScore: 52,
      hotspot: { top: '24%', left: '50%', label: 'Sink' },
      region: { min: [-90, 4, -6], max: [90, 14, 6] },
    },
    {
      id: 'undercut-bumper-1',
      title: 'Undercut on rear sensor mount',
      severity: 'medium',
      location: 'parking-sensor pockets, rear face',
      whyItMatters:
        'Sensor-mount bosses on the back face require a side action — adds ~$8K to tooling for one cavity.',
      costImpact: 'Side action: ~$8,000 tooling + extra mold maintenance every 100K cycles.',
      leadTimeImpact: 'Side-action build adds 1-2 weeks of tool time and validation.',
      recommendation: 'Move sensor bosses to a separate snap-on bracket; eliminate the side action entirely.',
      scoreImpact: '+6',
      beforeScore: 42,
      afterScore: 48,
      hotspot: { top: '68%', left: '78%', label: 'Undercut' },
      region: { min: [55, -14, -10], max: [95, 0, 10] },
    },
    {
      id: 'draft-bumper-1',
      title: 'Insufficient draft on wraparound ends',
      severity: 'medium',
      location: 'left and right wraparound ends',
      whyItMatters:
        'The curved ends pull at 0.8°, below the 1.5° minimum for textured automotive surfaces.',
      costImpact: 'Cosmetic drag marks on every part; rework or texture polish before paint.',
      leadTimeImpact: 'Tool polish to compensate adds 3-5 days; long-term wear faster.',
      recommendation: 'Increase draft to 2° minimum on all vertical wraparound faces.',
      scoreImpact: '+5',
      beforeScore: 42,
      afterScore: 47,
      hotspot: { top: '52%', left: '92%', label: 'Draft' },
      region: { min: [85, -16, -8], max: [102, 16, 12] },
    },
  ],
  supplierReadiness: {
    region: 'Michigan',
    status: 'Specialty supplier required',
    notes: 'Detroit Mold & Tool is the only Michigan shop with a press large enough for this projected area at this volume.',
  },
  checklist: [
    { id: 'check-1', label: 'Tool size matched to supplier press tonnage', status: 'action' },
    { id: 'check-2', label: 'Gate strategy validated via mold flow', status: 'action' },
    { id: 'check-3', label: 'Sensor mount strategy (integrated vs. bracket)', status: 'attention' },
    { id: 'check-4', label: 'Paint readiness — surface finish + draft check', status: 'attention' },
    { id: 'check-5', label: 'PPAP timeline aligned with vehicle program SOP', status: 'good' },
  ],
}

export const partsLibrary: Record<PartId, MoldAnalysisResult> = {
  bracket,
  phoneCase,
  droneArm,
  bumper,
}

/** Default part loaded into the dashboard on first render. */
export const moldAnalysisData: MoldAnalysisResult = bracket
