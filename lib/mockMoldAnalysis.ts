import type { DemoPartId, MoldAnalysisResult, PartId } from '@/lib/types'

// ---------------------------------------------------------------------------
// Mock analysis data for the MoldLocal results dashboard.
//
// This file stands in for the future backend response. When the CAD parsing /
// AI suggestions / supplier-readiness pipeline lands, replace this with a
// real fetch and adapt the response into the `MoldAnalysisResult` shape
// consumed by the dashboard components.
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
      hotspot: { top: '31%', left: '28%', label: 'Undercut' },
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
      hotspot: { top: '48%', left: '18%', label: 'Draft' },
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
      recommendation: 'Increase wall thickness to a consistent 0.098–0.118 in section.',
      scoreImpact: '+14',
      beforeScore: 56,
      afterScore: 70,
      hotspot: { top: '58%', left: '32%', label: 'Thin wall' },
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
      recommendation: 'Bump wall thickness on the long span from 0.055 in to 0.071 in.',
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
      recommendation: 'Add a minimum 0.020 in fillet to every inside corner.',
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
    { id: 'check-2', label: 'Inside corner radii ≥ 0.020 in', status: 'attention' },
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
      recommendation: 'Add stiffening ribs along the underside or thicken cross-section by 0.020 in.',
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
  partSummary:
    'Cosmetic front fascia for a passenger vehicle. Polypropylene, 1.7m wide, with integrated grille, fog-light bezels, license plate recess, parking sensors, and brake-cooling ducts.',
  overallScore: 38,
  improvedScore: 76,
  riskSummary: [
    {
      label: 'Michigan readiness',
      value: '38/100',
      description: 'Only tier-1 automotive molders can press a part this size locally.',
    },
    {
      label: 'Moldability',
      value: '44/100',
      description: 'Long flow path + thin cosmetic surfaces + multiple openings = high knit-line / sink risk.',
    },
    {
      label: 'Cost risk',
      value: 'High',
      description: 'Hardened single-cavity tool, multiple side actions, mold-flow validation gate add up fast.',
    },
    {
      label: 'Lead time',
      value: 'Long',
      description: 'Tool build + PPAP runs 16-20 weeks. Schedule against vehicle SOP.',
    },
  ],
  issues: [
    {
      id: 'knit-fog-left',
      title: 'Knit line behind left fog-light bezel',
      severity: 'high',
      location: 'left fog-light bezel pocket',
      whyItMatters:
        'Flow fronts meeting around the fog opening produce a visible cosmetic line on the painted surface that paint cannot hide.',
      costImpact: 'Cosmetic rejects at paint inspection; second-stage rework runs ~$0.40/part.',
      leadTimeImpact: 'Mold-flow simulation + gate re-balancing adds 1-2 weeks to design.',
      recommendation: 'Add a hot-tip gate inboard of the fog opening, or reduce wall thickness around it to bias flow.',
      scoreImpact: '+8',
      beforeScore: 38,
      afterScore: 46,
      hotspot: { top: '50%', left: '25%', label: 'Knit L' },
      region: { min: [-82, -12, 18], max: [-62, -1, 28] },
    },
    {
      id: 'knit-fog-right',
      title: 'Knit line behind right fog-light bezel',
      severity: 'high',
      location: 'right fog-light bezel pocket',
      whyItMatters:
        'Same flow-front collision as the left fog light. Symmetric flaw — both shop and customer will reject.',
      costImpact: 'Same rework cost as the left side; combined first-run reject rate climbs to ~5%.',
      leadTimeImpact: 'Resolved together with the left knit line; no additional schedule hit.',
      recommendation: 'Mirror the gate strategy across the centerline once the left-side fix is validated.',
      scoreImpact: '+7',
      beforeScore: 38,
      afterScore: 45,
      hotspot: { top: '50%', left: '75%', label: 'Knit R' },
      region: { min: [62, -12, 18], max: [82, -1, 28] },
    },
    {
      id: 'sink-upper-span',
      title: 'Sink on upper splitter span',
      severity: 'high',
      location: 'upper splitter / hood-line trim',
      whyItMatters:
        'A 1.4m unsupported chrome-like strip on top of the bumper sinks visibly during cooling — telegraphs onto the paint as a wavy line right at the eye-level transition.',
      costImpact: 'Surface defect rate ~6% before tuning; ~1% sustained after packing optimization.',
      leadTimeImpact: 'Cycle-time tuning + tool sampling extends ~1 week.',
      recommendation: 'Add internal stiffening ribs on the back of the splitter every ~5.9 in, OR thicken the splitter section from 0.098 in to 0.126 in.',
      scoreImpact: '+9',
      beforeScore: 38,
      afterScore: 47,
      hotspot: { top: '31%', left: '50%', label: 'Sink' },
      region: { min: [-75, 11, 18], max: [75, 16, 28] },
    },
    {
      id: 'weld-line-grille',
      title: 'Weld lines through grille slats',
      severity: 'medium',
      location: 'horizontal grille slats',
      whyItMatters:
        'Flow wraps around each slat and re-meets on the downstream side; the weld lines are visually subtle but structurally weaken the slats.',
      costImpact: 'Slat breakage during install / dealer prep: ~0.5% field-failure rate.',
      leadTimeImpact: 'Negligible at design time; field complaints surface 6-12 months post-SOP.',
      recommendation: 'Increase slat thickness from 0.063 in to 0.094 in, OR run a higher-temp mold to delay the freeze-off behind each slat.',
      scoreImpact: '+5',
      beforeScore: 38,
      afterScore: 43,
      hotspot: { top: '49%', left: '50%', label: 'Weld' },
      region: { min: [-30, -2, 23], max: [30, 11, 27] },
    },
    {
      id: 'undercut-sensors',
      title: 'Undercut on parking-sensor pucks',
      severity: 'medium',
      location: 'four sensor mounts, rear face',
      whyItMatters:
        'The four parking-sensor cylinders on the back face require a side action — adds ~$32K tooling and a recurring maintenance line item.',
      costImpact: '$32,000 incremental tooling + ~$2,500/year side-action maintenance.',
      leadTimeImpact: 'Side-action design + validation adds 2 weeks to mold build.',
      recommendation: 'Replace integrated bosses with a snap-on sensor carrier; eliminates all four side actions at the cost of a small assembly step.',
      scoreImpact: '+7',
      beforeScore: 38,
      afterScore: 45,
      hotspot: { top: '72%', left: '50%', label: 'Undercut' },
      region: { min: [-70, -5, -25], max: [70, 4, -18] },
    },
    {
      id: 'draft-wraparound-left',
      title: 'Insufficient draft on left wraparound',
      severity: 'medium',
      location: 'left wraparound end',
      whyItMatters:
        'The 30° wraparound curves the part inward toward the wheel arch but pulls at 0.8° draft — below the 1.5° minimum for the textured automotive finish.',
      costImpact: 'Cosmetic drag marks on every part; tool polish or texture rework before paint.',
      leadTimeImpact: 'Tool polish iteration adds 3-5 days; accelerated tool wear long-term.',
      recommendation: 'Increase draft to 2° on the wraparound vertical faces — small geometry change, big quality gain.',
      scoreImpact: '+4',
      beforeScore: 38,
      afterScore: 42,
      hotspot: { top: '54%', left: '9%', label: 'Draft L' },
      region: { min: [-110, -16, -15], max: [-82, 16, 8] },
    },
    {
      id: 'draft-wraparound-right',
      title: 'Insufficient draft on right wraparound',
      severity: 'medium',
      location: 'right wraparound end',
      whyItMatters: 'Mirror of the left wraparound issue.',
      costImpact: 'Same as left wraparound.',
      leadTimeImpact: 'Resolved alongside the left; no additional schedule hit.',
      recommendation: 'Mirror the draft increase across the centerline.',
      scoreImpact: '+4',
      beforeScore: 38,
      afterScore: 42,
      hotspot: { top: '54%', left: '91%', label: 'Draft R' },
      region: { min: [82, -16, -15], max: [110, 16, 8] },
    },
    {
      id: 'thin-plate-light',
      title: 'Thin section at license-plate light cutout',
      severity: 'low',
      location: 'license plate light bar',
      whyItMatters:
        'The 0.059 in light-bar cutout creates a localized thin section that hesitates during fill — risk of short-shot at the cutout when running cold.',
      costImpact: 'Low — only an issue if process temps drop below spec.',
      leadTimeImpact: 'None during design; flagged during PPAP if it surfaces.',
      recommendation: 'Bump local section to 0.071 in OR add a small dummy boss to keep flow moving through the area.',
      scoreImpact: '+4',
      beforeScore: 38,
      afterScore: 42,
      hotspot: { top: '32%', left: '50%', label: 'Thin' },
      region: { min: [-15, -4, 23], max: [15, -1, 26] },
    },
  ],
  supplierReadiness: {
    region: 'Michigan',
    status: 'Specialty supplier required',
    notes:
      'Detroit Mold & Tool (Sterling Heights) is the only Michigan shop with a press large enough for this projected area at this volume. 12-week tooling slot, $480K hardened single-cavity quote, PPAP included.',
  },
  checklist: [
    { id: 'check-1', label: 'Tool size matched to supplier press tonnage', status: 'action' },
    { id: 'check-2', label: 'Gate strategy validated via mold-flow', status: 'action' },
    { id: 'check-3', label: 'Sensor mount strategy (integrated vs. snap-on)', status: 'attention' },
    { id: 'check-4', label: 'Paint readiness — surface finish + draft check', status: 'attention' },
    { id: 'check-5', label: 'PPAP timeline aligned with vehicle program SOP', status: 'good' },
  ],
}

// 'custom' is intentionally excluded — AI-generated parts don't carry
// pre-authored rich-text issues / hotspots / supplier notes, so they
// don't appear in the dashboard's part library. The workspace
// surfaces (ManufacturingPanel, DFM HUD, /analysis/*) render against
// live moldsim output instead.
export const partsLibrary: Record<DemoPartId, MoldAnalysisResult> = {
  bracket,
  phoneCase,
  droneArm,
  bumper,
}

/** Safe accessor for code that holds a widened PartId. Returns the
 *  rich-text demo analysis for the four demo parts, or null for
 *  'custom' (or any future widened variant). Call sites that need a
 *  baseline default usually fall back to partsLibrary.bracket. */
export function getDashboardAnalysis(id: PartId): MoldAnalysisResult | null {
  return partsLibrary[id as DemoPartId] ?? null
}

/** Default part loaded into the dashboard on first render. The bumper
 *  is the hero demo case — most issues, most marked-up regions, most
 *  realistic geometry. Other parts are available via the sidebar. */
export const moldAnalysisData: MoldAnalysisResult = bumper
