'use client'

import Link from 'next/link'
import {
  AlertTriangle,
  Box,
  ClipboardCheck,
  DollarSign,
  Factory,
  FileText,
  GitCompare,
  Layers3,
  Search,
  Settings2,
  Triangle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

// SOLIDWORKS-style tab strip. Only "Evaluate" is functional in this
// project — the others are visible to keep the layout familiar but
// don't claim functionality we haven't built.
const TABS: { name: string; active: boolean }[] = [
  { name: 'Features', active: false },
  { name: 'Sketch', active: false },
  { name: 'Evaluate', active: true },
  { name: 'Markup', active: false },
]

// Each ribbon entry maps to a real destination in this app.
// Analysis links pre-select an issue on the results dashboard via the
// `focus` query param (read by ResultsDashboard).
const EVALUATE_GROUPS: {
  label: string
  items: { label: string; href: string; icon: LucideIcon }[]
}[] = [
  {
    label: 'Geometry analysis',
    items: [
      { label: 'Undercut Analysis', href: '/results?focus=undercut-1', icon: Box },
      { label: 'Draft Analysis', href: '/results?focus=draft-1', icon: Triangle },
      { label: 'Thickness Analysis', href: '/results?focus=thin-wall-1', icon: Layers3 },
    ],
  },
  {
    label: 'Manufacturing',
    items: [
      { label: 'Costing', href: '/results', icon: DollarSign },
      { label: 'On Demand Manufacturing', href: '/results', icon: Factory },
      { label: 'Part Reviewer', href: '/results', icon: ClipboardCheck },
    ],
  },
]

export function Toolbar() {
  const { setShowDiff, showManufacturing, setShowManufacturing, setRightPanel } =
    useAppStore()

  const handleToggleManufacturing = () => {
    const newState = !showManufacturing
    setShowManufacturing(newState)
    if (newState) {
      setRightPanel('manufacturing')
    }
  }

  return (
    <header className="bg-zinc-900 border-b border-zinc-800">
      {/* Tab strip */}
      <div className="flex items-center justify-between px-3 pt-1.5">
        <div className="flex items-end gap-0.5">
          <span className="flex items-center gap-2 px-2 py-1 mr-3 text-sm font-semibold text-zinc-200">
            <span className="size-5 rounded bg-blue-500/15 border border-blue-500/40 flex items-center justify-center">
              <Settings2 className="size-3 text-blue-300" />
            </span>
            MoldLocal Design
          </span>
          {TABS.map((tab) => (
            <span
              key={tab.name}
              className={`px-3 py-1.5 text-xs rounded-t border-x border-t transition-colors ${
                tab.active
                  ? 'bg-zinc-950 border-zinc-700 text-zinc-100'
                  : 'border-transparent text-zinc-500'
              }`}
              aria-current={tab.active ? 'page' : undefined}
            >
              {tab.name}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2 pb-1">
          <div className="hidden md:flex items-center gap-2 px-2 py-1 bg-zinc-950 border border-zinc-700 rounded text-xs text-zinc-500 w-56">
            <Search className="size-3" />
            <span>Search analyses</span>
          </div>
        </div>
      </div>

      {/* Evaluate ribbon */}
      <div className="flex items-stretch justify-between border-t border-zinc-800 bg-zinc-950/40">
        <div className="flex items-stretch">
          {EVALUATE_GROUPS.map((group, gi) => (
            <div
              key={group.label}
              className={`flex flex-col px-2 py-1.5 ${
                gi < EVALUATE_GROUPS.length - 1 ? 'border-r border-zinc-800' : ''
              }`}
            >
              <div className="flex items-center gap-1">
                {group.items.map((item) => (
                  <RibbonLink
                    key={item.label}
                    href={item.href}
                    icon={item.icon}
                    label={item.label}
                  />
                ))}
              </div>
              <span className="text-[10px] uppercase tracking-wider text-zinc-600 mt-1 px-1">
                {group.label}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1 px-3 border-l border-zinc-800">
          <RibbonButton
            onClick={() => setShowDiff(true)}
            icon={GitCompare}
            label="Diff"
          />
          <RibbonButton
            onClick={handleToggleManufacturing}
            icon={AlertTriangle}
            label="Manufacturing"
            active={showManufacturing}
          />

          <div className="h-8 w-px bg-zinc-700 mx-1" />

          <Link
            href="/results"
            className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 rounded text-sm font-medium text-white"
            title="View MoldLocal readiness report"
          >
            <FileText className="size-4" />
            <span>Reports</span>
          </Link>
        </div>
      </div>
    </header>
  )
}

function RibbonLink({
  href,
  icon: Icon,
  label,
}: {
  href: string
  icon: LucideIcon
  label: string
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1 px-2.5 py-1.5 rounded hover:bg-zinc-800 text-zinc-300 transition-colors"
      title={label}
    >
      <Icon className="size-5 text-zinc-300" />
      <span className="text-[10px] leading-tight text-zinc-400 text-center max-w-[78px]">
        {label}
      </span>
    </Link>
  )
}

function RibbonButton({
  onClick,
  icon: Icon,
  label,
  active,
}: {
  onClick: () => void
  icon: LucideIcon
  label: string
  active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-2.5 py-1.5 rounded transition-colors ${
        active
          ? 'bg-orange-600 hover:bg-orange-700 text-white'
          : 'hover:bg-zinc-800 text-zinc-300'
      }`}
      title={label}
    >
      <Icon className="size-5" />
      <span className="text-[10px] leading-tight text-center max-w-[78px]">
        {label}
      </span>
    </button>
  )
}
