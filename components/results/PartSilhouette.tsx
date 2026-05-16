'use client'

import type { PartId } from '@/lib/types'

/**
 * Lightweight per-part SVG silhouettes for the dashboard PartPreview.
 *
 * Replaces the WebGL MiniViewport so the only active WebGL context is
 * the workspace viewport — keeps us well under Chrome's per-tab cap and
 * lets the dashboard render on machines without GPUs.
 */
export function PartSilhouette({ partId }: { partId: PartId }) {
  switch (partId) {
    case 'bracket':
      return <BracketSilhouette />
    case 'phoneCase':
      return <PhoneCaseSilhouette />
    case 'droneArm':
      return <DroneArmSilhouette />
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

function BracketSilhouette() {
  return (
    <svg
      viewBox="0 0 400 300"
      className="absolute inset-0 w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <Defs />
      <GridFloor />
      <g>
        <path
          d="M80 200 L80 130 Q80 110 100 110 L260 110 Q280 110 280 130 L280 200 Z"
          fill="url(#partFill)"
          stroke="url(#partEdge)"
          strokeWidth="1.5"
        />
        <path d="M70 120 L290 120 L300 105 L80 105 Z" fill="#52525b" stroke="#71717a" />
        <path d="M280 130 L300 130 L305 140 L300 150 L280 150 Z" fill="#3f3f46" stroke="#71717a" />
        <circle cx="120" cy="155" r="8" fill="#09090b" stroke="#71717a" />
        <circle cx="240" cy="155" r="8" fill="#09090b" stroke="#71717a" />
        <path d="M110 175 L250 175 L250 195 L110 195 Z" fill="#09090b" opacity="0.6" />
      </g>
      <g fill="#52525b" fontSize="9" fontFamily="ui-monospace, monospace">
        <text x="180" y="245" textAnchor="middle">120 mm</text>
        <text x="40" y="160" textAnchor="middle">90 mm</text>
      </g>
    </svg>
  )
}

function PhoneCaseSilhouette() {
  return (
    <svg
      viewBox="0 0 400 300"
      className="absolute inset-0 w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <Defs />
      <GridFloor />
      <g>
        {/* Outer shell */}
        <rect
          x="140"
          y="55"
          width="120"
          height="200"
          rx="16"
          fill="url(#partFill)"
          stroke="url(#partEdge)"
          strokeWidth="1.5"
        />
        {/* Inner cavity */}
        <rect
          x="148"
          y="63"
          width="104"
          height="184"
          rx="12"
          fill="#09090b"
          opacity="0.7"
        />
        {/* Camera cutout */}
        <circle cx="180" cy="85" r="10" fill="#09090b" stroke="#71717a" />
        <circle cx="180" cy="85" r="5" fill="#27272a" />
        {/* Speaker grille */}
        <line x1="195" y1="230" x2="225" y2="230" stroke="#71717a" strokeWidth="2" />
      </g>
      <g fill="#52525b" fontSize="9" fontFamily="ui-monospace, monospace">
        <text x="200" y="275" textAnchor="middle">70 × 140 mm</text>
        <text x="115" y="155" textAnchor="end">8 mm</text>
      </g>
    </svg>
  )
}

function DroneArmSilhouette() {
  return (
    <svg
      viewBox="0 0 400 300"
      className="absolute inset-0 w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <Defs />
      <GridFloor />
      <g>
        {/* Center body */}
        <rect
          x="40"
          y="135"
          width="55"
          height="30"
          rx="3"
          fill="url(#partFill)"
          stroke="url(#partEdge)"
          strokeWidth="1.5"
        />
        {/* Arm */}
        <rect
          x="95"
          y="143"
          width="230"
          height="14"
          fill="url(#partFill)"
          stroke="url(#partEdge)"
          strokeWidth="1.5"
        />
        {/* Motor mount disc */}
        <circle cx="330" cy="150" r="22" fill="#52525b" stroke="#71717a" />
        <circle cx="330" cy="150" r="14" fill="#27272a" stroke="#71717a" />
        {/* Motor stub */}
        <rect x="320" y="120" width="20" height="14" rx="2" fill="#3f3f46" stroke="#71717a" />
      </g>
      <g fill="#52525b" fontSize="9" fontFamily="ui-monospace, monospace">
        <text x="180" y="190" textAnchor="middle">180 mm arm</text>
        <text x="330" y="195" textAnchor="middle">Ø36 motor</text>
      </g>
    </svg>
  )
}
