'use client'

import type { PartId } from '@/lib/types'

/**
 * Lightweight per-part SVG silhouettes for the dashboard PartPreview.
 *
 * Each silhouette is drawn to MATCH the procedural geometry in
 * components/viewport/partGeometry.ts so the dashboard's 2D preview
 * and the workspace's 3D viewport tell the same story. Hotspot
 * percentages in lib/mockMoldAnalysis.ts are tuned to land on the
 * corresponding feature in each silhouette.
 */
export function PartSilhouette({ partId }: { partId: PartId }) {
  switch (partId) {
    case 'bracket':
      return <BracketSilhouette />
    case 'phoneCase':
      return <PhoneCaseSilhouette />
    case 'droneArm':
      return <DroneArmSilhouette />
    case 'bumper':
      return <BumperSilhouette />
    default:
      return null
  }
}

function GridFloor() {
  return (
    <g stroke="#27272a" strokeWidth="0.5" opacity="0.5">
      {Array.from({ length: 12 }).map((_, i) => (
        <line key={`h-${i}`} x1="0" y1={i * 25 + 5} x2="400" y2={i * 25 + 5} />
      ))}
      {Array.from({ length: 16 }).map((_, i) => (
        <line key={`v-${i}`} x1={i * 25 + 5} y1="0" x2={i * 25 + 5} y2="300" />
      ))}
    </g>
  )
}

function Defs() {
  return (
    <defs>
      <linearGradient id="partFill" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#3f3f46" />
        <stop offset="100%" stopColor="#18181b" />
      </linearGradient>
      <linearGradient id="partEdge" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#71717a" />
        <stop offset="100%" stopColor="#3f3f46" />
      </linearGradient>
    </defs>
  )
}

/** L-shaped bracket viewed from the FRONT (matches the 3D part):
 *  horizontal base + vertical wall on the left + stiffener rib in the
 *  corner + snap-fit hook protruding from the top of the wall. */
function BracketSilhouette() {
  return (
    <svg
      viewBox="0 0 400 300"
      className="absolute inset-0 w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <Defs />
      <GridFloor />

      {/* Floor shadow */}
      <ellipse cx="200" cy="248" rx="160" ry="6" fill="#000" opacity="0.25" />

      <g>
        {/* Horizontal base: full footprint */}
        <rect
          x="55"
          y="210"
          width="290"
          height="32"
          fill="url(#partFill)"
          stroke="url(#partEdge)"
          strokeWidth="1.5"
        />

        {/* Vertical wall: sits on the LEFT edge of the base, growing
            upward. Matches the 3D geometry exactly. */}
        <rect
          x="55"
          y="80"
          width="36"
          height="130"
          fill="url(#partFill)"
          stroke="url(#partEdge)"
          strokeWidth="1.5"
        />

        {/* Stiffener rib: triangular wedge tucked into the corner where
            the wall meets the base. */}
        <polygon
          points="91,210 91,140 165,210"
          fill="#3f3f46"
          stroke="#71717a"
          strokeWidth="1"
        />

        {/* Snap-fit hook: small overhang protruding right from the TOP
            of the wall — this is the "undercut" issue. */}
        <path
          d="M 91 84 L 130 84 L 134 92 L 130 100 L 91 100 Z"
          fill="#52525b"
          stroke="#a1a1aa"
          strokeWidth="1"
        />

        {/* Top-of-wall accent line so the wall reads as 3D */}
        <line x1="55" y1="80" x2="91" y2="80" stroke="#a1a1aa" strokeWidth="1.2" />
      </g>

      {/* Dimension hints */}
      <g fill="#52525b" fontSize="9" fontFamily="ui-monospace, monospace">
        <text x="200" y="265" textAnchor="middle">120 mm</text>
        <text x="40" y="145" textAnchor="end">90 mm</text>
      </g>
    </svg>
  )
}

/** Phone case back viewed from the BACK (inside-up): rounded outer
 *  shell with a rounded inner cavity. No camera cutout — the procedural
 *  geometry doesn't have one. */
function PhoneCaseSilhouette() {
  return (
    <svg
      viewBox="0 0 400 300"
      className="absolute inset-0 w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <Defs />
      <GridFloor />

      {/* Floor shadow */}
      <ellipse cx="200" cy="260" rx="80" ry="5" fill="#000" opacity="0.25" />

      <g>
        {/* Outer shell — rounded rect, taller than wide */}
        <rect
          x="155"
          y="40"
          width="90"
          height="220"
          rx="14"
          fill="url(#partFill)"
          stroke="url(#partEdge)"
          strokeWidth="1.5"
        />

        {/* Inner cavity (where the phone sits) */}
        <rect
          x="163"
          y="48"
          width="74"
          height="204"
          rx="9"
          fill="#09090b"
          opacity="0.85"
          stroke="#52525b"
          strokeWidth="0.6"
        />

        {/* Corner radius indicator (top-left) to make it read as a real
            molded part rather than a flat rectangle */}
        <path
          d="M 169 56 Q 169 50 175 50"
          fill="none"
          stroke="#a1a1aa"
          strokeWidth="0.8"
          strokeDasharray="2 2"
        />
      </g>

      <g fill="#52525b" fontSize="9" fontFamily="ui-monospace, monospace">
        <text x="200" y="278" textAnchor="middle">70 × 140 mm</text>
        <text x="138" y="155" textAnchor="end">1.4 mm wall</text>
      </g>
    </svg>
  )
}

/** Drone arm viewed from the TOP (matches the 3D geometry): central
 *  body block on the left + long thin arm + motor-mount disc + motor
 *  stub at the outboard end. */
function DroneArmSilhouette() {
  return (
    <svg
      viewBox="0 0 400 300"
      className="absolute inset-0 w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <Defs />
      <GridFloor />

      {/* Floor shadow */}
      <ellipse cx="200" cy="200" rx="180" ry="5" fill="#000" opacity="0.25" />

      <g>
        {/* Central body block — square-ish on the inboard end */}
        <rect
          x="40"
          y="120"
          width="62"
          height="60"
          rx="3"
          fill="url(#partFill)"
          stroke="url(#partEdge)"
          strokeWidth="1.5"
        />

        {/* Arm: starts at the right edge of the center block, extends
            most of the way to the right */}
        <rect
          x="102"
          y="140"
          width="200"
          height="22"
          fill="url(#partFill)"
          stroke="url(#partEdge)"
          strokeWidth="1.5"
        />

        {/* Motor mount disc at the outboard end */}
        <circle
          cx="320"
          cy="151"
          r="30"
          fill="#52525b"
          stroke="#a1a1aa"
          strokeWidth="1.2"
        />
        {/* Inner motor pocket */}
        <circle
          cx="320"
          cy="151"
          r="15"
          fill="#1f1f23"
          stroke="#71717a"
          strokeWidth="0.8"
        />

        {/* Mount bolt circle */}
        {[0, 1, 2, 3].map((i) => {
          const a = (i * Math.PI) / 2 + Math.PI / 4
          const cx = 320 + Math.cos(a) * 22
          const cy = 151 + Math.sin(a) * 22
          return <circle key={i} cx={cx} cy={cy} r="1.8" fill="#27272a" stroke="#71717a" strokeWidth="0.5" />
        })}
      </g>

      <g fill="#52525b" fontSize="9" fontFamily="ui-monospace, monospace">
        <text x="200" y="190" textAnchor="middle">180 mm arm</text>
        <text x="320" y="200" textAnchor="middle">Ø60 motor mount</text>
      </g>
    </svg>
  )
}

/** Automotive front bumper viewed head-on: long horizontal beam with
 *  wraparound ends, a central grille indent, two fog-light bezels, top
 *  lip, and a lower air dam. */
function BumperSilhouette() {
  return (
    <svg
      viewBox="0 0 400 300"
      className="absolute inset-0 w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <Defs />
      <GridFloor />

      {/* Ground shadow */}
      <ellipse cx="200" cy="222" rx="170" ry="6" fill="#000" opacity="0.3" />

      <g>
        {/* Wraparound ends — angled trapezoids at the very edges */}
        <path
          d="M 30 130 L 60 105 L 60 195 L 30 215 Z"
          fill="url(#partFill)"
          stroke="url(#partEdge)"
          strokeWidth="1.5"
        />
        <path
          d="M 370 130 L 340 105 L 340 195 L 370 215 Z"
          fill="url(#partFill)"
          stroke="url(#partEdge)"
          strokeWidth="1.5"
        />

        {/* Main horizontal beam */}
        <rect
          x="60"
          y="100"
          width="280"
          height="100"
          fill="url(#partFill)"
          stroke="url(#partEdge)"
          strokeWidth="1.5"
        />

        {/* Top lip — sits flush along the top edge of the beam */}
        <rect x="68" y="92" width="264" height="12" fill="#52525b" stroke="#a1a1aa" strokeWidth="0.8" />

        {/* Lower air dam */}
        <rect x="72" y="198" width="256" height="14" fill="#3f3f46" stroke="#71717a" strokeWidth="0.8" />

        {/* Central grille indent — slightly recessed (darker) */}
        <rect
          x="155"
          y="125"
          width="90"
          height="50"
          fill="#1f1f23"
          stroke="#71717a"
          strokeWidth="1"
        />
        {/* Horizontal grille slats */}
        {[0, 1, 2, 3].map((i) => (
          <line
            key={`slat-${i}`}
            x1="160"
            x2="240"
            y1={134 + i * 11}
            y2={134 + i * 11}
            stroke="#52525b"
            strokeWidth="1.4"
          />
        ))}

        {/* Fog-light bezels — circles on either side of the grille */}
        <circle cx="100" cy="160" r="18" fill="#1f1f23" stroke="#71717a" strokeWidth="1.2" />
        <circle cx="100" cy="160" r="9" fill="#27272a" />
        <circle cx="300" cy="160" r="18" fill="#1f1f23" stroke="#71717a" strokeWidth="1.2" />
        <circle cx="300" cy="160" r="9" fill="#27272a" />
      </g>

      <g fill="#52525b" fontSize="9" fontFamily="ui-monospace, monospace">
        <text x="200" y="240" textAnchor="middle">1700 mm</text>
        <text x="20" y="160" textAnchor="middle" transform="rotate(-90 20 160)">
          450 mm
        </text>
      </g>
    </svg>
  )
}
