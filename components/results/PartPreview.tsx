'use client'

import { useResultsStore } from '@/store/useResultsStore'
import type { MoldIssue, MoldIssueSeverity } from '@/lib/types'

const SEVERITY_RING: Record<MoldIssueSeverity, string> = {
  high: 'bg-rose-500 shadow-[0_0_0_8px_rgba(244,63,94,0.18)]',
  medium: 'bg-amber-400 shadow-[0_0_0_8px_rgba(251,191,36,0.18)]',
  low: 'bg-emerald-400 shadow-[0_0_0_8px_rgba(52,211,153,0.18)]',
}

const SEVERITY_LABEL: Record<MoldIssueSeverity, string> = {
  high: 'border-rose-500/60 text-rose-200 bg-rose-500/15',
  medium: 'border-amber-400/60 text-amber-100 bg-amber-400/15',
  low: 'border-emerald-400/60 text-emerald-100 bg-emerald-400/15',
}

function Hotspot({ issue }: { issue: MoldIssue }) {
  const { selectedIssueId, selectIssue, fixedIssueIds } = useResultsStore()
  const isSelected = selectedIssueId === issue.id
  const isFixed = fixedIssueIds.includes(issue.id)

  return (
    <button
      onClick={() => selectIssue(issue.id)}
      className="absolute -translate-x-1/2 -translate-y-1/2 group focus:outline-none"
      style={{ top: issue.hotspot.top, left: issue.hotspot.left }}
      aria-label={`Open issue: ${issue.title}`}
    >
      <span
        className={`block size-4 rounded-full transition-all duration-200 ${
          isFixed
            ? 'bg-emerald-500 shadow-[0_0_0_8px_rgba(52,211,153,0.18)]'
            : SEVERITY_RING[issue.severity]
        } ${isSelected ? 'scale-125 ring-2 ring-white/70' : 'group-hover:scale-110'}`}
      >
        <span
          className={`absolute inset-0 rounded-full ${
            isFixed ? '' : 'animate-ping'
          } ${isFixed ? '' : SEVERITY_RING[issue.severity].split(' ')[0]}`}
        />
      </span>
      <span
        className={`absolute left-5 top-1/2 -translate-y-1/2 px-2 py-0.5 text-[10px] font-medium rounded-md border whitespace-nowrap ${
          SEVERITY_LABEL[issue.severity]
        } ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
      >
        {issue.hotspot.label}
      </span>
    </button>
  )
}

export function PartPreview() {
  const { analysis } = useResultsStore()

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div>
          <h2 className="text-sm font-medium text-zinc-100">Part Preview</h2>
          <p className="text-xs text-zinc-500">
            Click a highlighted area to inspect the issue
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-rose-500" /> High
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-amber-400" /> Medium
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-400" /> Fixed
          </span>
        </div>
      </div>

      <div className="relative aspect-[4/3] bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
        <BracketIllustration />
        {analysis.issues.map((issue) => (
          <Hotspot key={issue.id} issue={issue} />
        ))}
      </div>

      <div className="px-4 py-2 border-t border-zinc-800 text-xs text-zinc-500 flex items-center justify-between">
        <span className="font-mono">{analysis.partName}</span>
        <span>{analysis.issues.length} issues detected</span>
      </div>
    </div>
  )
}

function BracketIllustration() {
  // Stylised plastic bracket — kept as a lightweight SVG placeholder
  // until the team wires in the real 3D viewport / CAD output.
  return (
    <svg
      viewBox="0 0 400 300"
      className="absolute inset-0 w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="bracketFill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3f3f46" />
          <stop offset="100%" stopColor="#18181b" />
        </linearGradient>
        <linearGradient id="bracketEdge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#71717a" />
          <stop offset="100%" stopColor="#3f3f46" />
        </linearGradient>
      </defs>

      {/* Grid floor */}
      <g stroke="#27272a" strokeWidth="0.5" opacity="0.5">
        {Array.from({ length: 12 }).map((_, i) => (
          <line
            key={`h-${i}`}
            x1="0"
            y1={i * 25 + 5}
            x2="400"
            y2={i * 25 + 5}
          />
        ))}
        {Array.from({ length: 16 }).map((_, i) => (
          <line
            key={`v-${i}`}
            x1={i * 25 + 5}
            y1="0"
            x2={i * 25 + 5}
            y2="300"
          />
        ))}
      </g>

      {/* Main bracket body */}
      <g>
        <path
          d="M80 200 L80 130 Q80 110 100 110 L260 110 Q280 110 280 130 L280 200 Z"
          fill="url(#bracketFill)"
          stroke="url(#bracketEdge)"
          strokeWidth="1.5"
        />
        {/* Top plate */}
        <path
          d="M70 120 L290 120 L300 105 L80 105 Z"
          fill="#52525b"
          stroke="#71717a"
          strokeWidth="1"
        />
        {/* Snap-fit hook on the right */}
        <path
          d="M280 130 L300 130 L305 140 L300 150 L280 150 Z"
          fill="#3f3f46"
          stroke="#71717a"
          strokeWidth="1"
        />
        {/* Mounting holes */}
        <circle cx="120" cy="155" r="8" fill="#09090b" stroke="#71717a" />
        <circle cx="240" cy="155" r="8" fill="#09090b" stroke="#71717a" />
        {/* Inner cavity hint */}
        <path
          d="M110 175 L250 175 L250 195 L110 195 Z"
          fill="#09090b"
          opacity="0.6"
        />
        {/* Side wall indicator */}
        <line x1="80" y1="200" x2="80" y2="220" stroke="#52525b" strokeWidth="2" />
        <line x1="280" y1="200" x2="280" y2="220" stroke="#52525b" strokeWidth="2" />
      </g>

      {/* Dimension hints */}
      <g fill="#52525b" fontSize="9" fontFamily="ui-monospace, monospace">
        <text x="180" y="245" textAnchor="middle">120 mm</text>
        <text x="40" y="160" textAnchor="middle">90 mm</text>
      </g>
    </svg>
  )
}
