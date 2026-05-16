'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  Box,
  Circle,
  CircleDot,
  ClipboardCheck,
  DollarSign,
  Factory,
  FileText,
  GitCompare,
  Layers3,
  Locate,
  LogOut,
  Pencil,
  Search,
  Settings2,
  Sparkles,
  Square,
  Triangle,
  Wrench,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { Feature, FeatureType } from '@/lib/types'

type Tab = 'Features' | 'Sketch' | 'Evaluate' | 'Markup'
const TABS: Tab[] = ['Features', 'Sketch', 'Evaluate', 'Markup']

const FEATURE_ICONS: Record<FeatureType, LucideIcon> = {
  origin: Locate,
  sketch: Pencil,
  extrude: Box,
  revolve: Circle,
  fillet: Wrench,
  chamfer: Triangle,
  hole: CircleDot,
  plane: Square,
}

function flattenFeatures(features: Feature[]): Feature[] {
  return features.flatMap((f) => [f, ...(f.children ?? [])])
}

export function Toolbar() {
  const [activeTab, setActiveTab] = useState<Tab>('Features')
  const {
    features,
    selectedFeature,
    selectFeature,
    aiSuggestions,
    previewSuggestion,
    setShowDiff,
    showManufacturing,
    setShowManufacturing,
    setRightPanel,
    logout,
  } = useAppStore()

  const handleToggleManufacturing = () => {
    const newState = !showManufacturing
    setShowManufacturing(newState)
    if (newState) {
      setRightPanel('manufacturing')
    }
  }

  return (
    <header className="bg-zinc-900 border-b border-zinc-800">
      {/* Tab strip — tabs are interactive and swap the ribbon below. */}
      <div className="flex items-center justify-between px-3 pt-2">
        <div className="flex items-end gap-1">
          <span className="flex items-center gap-2 px-2 py-1.5 mr-3 text-sm font-semibold text-zinc-200">
            <span className="size-6 rounded bg-blue-500/15 border border-blue-500/40 flex items-center justify-center">
              <Settings2 className="size-3.5 text-blue-300" />
            </span>
            MoldLocal Design
          </span>
          {TABS.map((tab) => {
            const isActive = activeTab === tab
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm rounded-t border-x border-t transition-colors ${
                  isActive
                    ? 'bg-zinc-950 border-zinc-700 text-zinc-100'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {tab}
              </button>
            )
          })}
        </div>

        <div className="hidden md:flex items-center gap-2 px-2.5 py-1.5 mb-1.5 bg-zinc-950 border border-zinc-700 rounded text-xs text-zinc-500 w-60">
          <Search className="size-3.5" />
          <span>Search analyses</span>
        </div>
      </div>

      {/* Ribbon row — content driven by the active tab. */}
      <div className="flex items-stretch border-t border-zinc-800 bg-zinc-950/40 min-h-[88px]">
        {activeTab === 'Features' && (
          <FeaturesRibbon
            features={flattenFeatures(features)}
            selectedFeature={selectedFeature}
            onSelect={selectFeature}
          />
        )}
        {activeTab === 'Sketch' && (
          <SketchRibbon
            sketches={features.filter((f) => f.type === 'sketch')}
            selectedFeature={selectedFeature}
            onSelect={selectFeature}
          />
        )}
        {activeTab === 'Evaluate' && <EvaluateRibbon />}
        {activeTab === 'Markup' && (
          <MarkupRibbon
            suggestions={aiSuggestions}
            onPreview={(id) => {
              previewSuggestion(id)
              setRightPanel('ai')
            }}
          />
        )}

        {/* Persistent global actions — rendered as the rightmost ribbon group */}
        <RibbonGroup bordered>
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
          <RibbonLink href="/results" icon={FileText} label="Reports" />
          <RibbonButton
            onClick={logout}
            icon={LogOut}
            label="Sign out"
          />
        </RibbonGroup>
      </div>
    </header>
  )
}

// ---------------------------------------------------------------------------
// Ribbon variants
// ---------------------------------------------------------------------------

function FeaturesRibbon({
  features,
  selectedFeature,
  onSelect,
}: {
  features: Feature[]
  selectedFeature: string | null
  onSelect: (id: string | null) => void
}) {
  return (
    <RibbonGroup>
      {features.map((f) => (
        <RibbonButton
          key={f.id}
          icon={FEATURE_ICONS[f.type]}
          label={f.name}
          active={selectedFeature === f.id}
          onClick={() => onSelect(f.id)}
        />
      ))}
    </RibbonGroup>
  )
}

function SketchRibbon({
  sketches,
  selectedFeature,
  onSelect,
}: {
  sketches: Feature[]
  selectedFeature: string | null
  onSelect: (id: string | null) => void
}) {
  return (
    <RibbonGroup>
      {sketches.length === 0 ? (
        <span className="text-xs text-zinc-500 px-3 py-3 self-center">
          No sketches in this part
        </span>
      ) : (
        sketches.map((s) => (
          <RibbonButton
            key={s.id}
            icon={Pencil}
            label={s.name}
            active={selectedFeature === s.id}
            onClick={() => onSelect(s.id)}
          />
        ))
      )}
    </RibbonGroup>
  )
}

function MarkupRibbon({
  suggestions,
  onPreview,
}: {
  suggestions: { id: string; title: string; status: string }[]
  onPreview: (id: string) => void
}) {
  return (
    <RibbonGroup>
      {suggestions.length === 0 ? (
        <span className="text-xs text-zinc-500 px-3 py-3 self-center">
          No suggestions yet
        </span>
      ) : (
        suggestions.map((s) => (
          <RibbonButton
            key={s.id}
            icon={Sparkles}
            label={s.title}
            active={s.status === 'previewing'}
            onClick={() => onPreview(s.id)}
          />
        ))
      )}
    </RibbonGroup>
  )
}

function EvaluateRibbon() {
  return (
    <>
      <RibbonGroup bordered>
        <RibbonLink href="/analysis/undercut" icon={Box} label="Undercut Analysis" />
        <RibbonLink href="/analysis/draft" icon={Triangle} label="Draft Analysis" />
        <RibbonLink
          href="/analysis/thickness"
          icon={Layers3}
          label="Thickness Analysis"
        />
      </RibbonGroup>
      <RibbonGroup>
        <RibbonLink href="/analysis/costing" icon={DollarSign} label="Costing" />
        <RibbonLink
          href="/analysis/on-demand"
          icon={Factory}
          label="On Demand Manufacturing"
        />
        <RibbonLink href="/results" icon={ClipboardCheck} label="Part Reviewer" />
      </RibbonGroup>
    </>
  )
}

// ---------------------------------------------------------------------------
// Shared primitives — uniform SOLIDWORKS-style ribbon button: icon on top,
// multi-line label below, thin vertical dividers between groups.
// ---------------------------------------------------------------------------

function RibbonGroup({
  children,
  bordered,
}: {
  children: React.ReactNode
  bordered?: boolean
}) {
  return (
    <div
      className={`flex items-center gap-0.5 px-2 ${
        bordered ? 'border-r border-zinc-800' : ''
      }`}
    >
      {children}
    </div>
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
      className="flex flex-col items-center justify-start gap-1 w-[78px] px-1 py-2 rounded hover:bg-zinc-800 text-zinc-300 transition-colors"
      title={label}
    >
      <Icon className="size-6 text-zinc-300 shrink-0" />
      <span className="text-[11px] leading-tight text-zinc-400 text-center break-words">
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
      className={`flex flex-col items-center justify-start gap-1 w-[78px] px-1 py-2 rounded transition-colors ${
        active
          ? 'bg-blue-600/80 hover:bg-blue-600 text-white'
          : 'hover:bg-zinc-800 text-zinc-300'
      }`}
      title={label}
    >
      <Icon className="size-6 shrink-0" />
      <span className="text-[11px] leading-tight text-center break-words">
        {label}
      </span>
    </button>
  )
}
