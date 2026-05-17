'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  AlertTriangle,
  Box,
  ClipboardCheck,
  DollarSign,
  Factory,
  FileText,
  FolderOpen,
  Layers3,
  LogOut,
  Search,
  Settings2,
  Sparkles,
  Triangle,
  Upload,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/store/useAppStore'
import { useResultsStore } from '@/store/useResultsStore'
import { getDashboardAnalysis, partsLibrary } from '@/lib/mockMoldAnalysis'
import type { DesignProposal, PartId } from '@/lib/types'

type Tab = 'Part' | 'Evaluate' | 'AI optimizations'
const TABS: Tab[] = ['Part', 'Evaluate', 'AI optimizations']

export function Toolbar() {
  const [activeTab, setActiveTab] = useState<Tab>('Part')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const {
    aiPartSuggestions,
    showManufacturing,
    setShowManufacturing,
    setRightPanel,
    setRightCollapsed,
    logout,
    currentPartId,
    setCurrentPartId,
    setUploadedSTL,
    uploadedSTL,
    setCustomPartSpec,
    applyDesignProposal,
  } = useAppStore()

  const handleToggleManufacturing = () => {
    const newState = !showManufacturing
    setShowManufacturing(newState)
    if (newState) {
      setRightPanel('manufacturing')
    }
  }

  const handleUploadClick = () => fileInputRef.current?.click()
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.stl')) {
      toast.error('Only .stl files are supported right now.')
      return
    }
    const url = URL.createObjectURL(file)
    setUploadedSTL(url)
    toast.success(`Loaded ${file.name}`, { description: 'Moldability heatmap regenerated.' })
    e.target.value = ''
  }
  const handleClearUpload = () => {
    setUploadedSTL(null)
    toast('Reverted to demo part', { description: getDashboardAnalysis(currentPartId as PartId)?.partName ?? '' })
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
        {/* Scrollable part — grows and scrolls so many AI parts never push demo buttons off-screen */}
        <div className="flex-1 flex items-stretch overflow-x-auto min-w-0">
          {activeTab === 'Part' && (
            <PartRibbon
              currentPartId={currentPartId as PartId}
              uploadedSTL={uploadedSTL}
              onSelectPart={(id) => {
                setCustomPartSpec(null)
                useResultsStore.getState().selectPart(id)
                toast(getDashboardAnalysis(id)?.partName ?? id, { description: 'Loaded from part library.' })
              }}
              onUploadClick={handleUploadClick}
              onClearUpload={handleClearUpload}
            />
          )}
          {activeTab === 'Evaluate' && <EvaluateRibbon />}
          {activeTab === 'AI optimizations' && (
            <MarkupRibbon
              suggestions={aiPartSuggestions.items}
              loading={aiPartSuggestions.loading}
              onAccept={applyDesignProposal}
              onPreview={() => {
                setRightPanel('ai')
                setRightCollapsed(false)
              }}
            />
          )}
        </div>

        {/* Persistent global actions — pinned to the right, never scrolled away */}
        <RibbonGroup bordered>
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

        <input
          ref={fileInputRef}
          type="file"
          accept=".stl"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </header>
  )
}

// ---------------------------------------------------------------------------
// Ribbon variants
// ---------------------------------------------------------------------------

// "Part" tab — drives which geometry is loaded into the viewport. The
// part-library swap-on-click is the same logic /results uses; lifting it
// here is the Phase 1 fix for "Part Library should be in the top menu."
function PartRibbon({
  currentPartId,
  uploadedSTL,
  onSelectPart,
  onUploadClick,
  onClearUpload,
}: {
  currentPartId: PartId
  uploadedSTL: string | null
  onSelectPart: (id: PartId) => void
  onUploadClick: () => void
  onClearUpload: () => void
}) {
  const partIds = Object.keys(partsLibrary) as Array<Exclude<PartId, 'custom'>>
  const userParts = useAppStore((s) => s.userParts)
  const removeUserPart = useAppStore((s) => s.removeUserPart)
  const selectUserPart = useResultsStore((s) => s.selectUserPart)

  function handleDelete(id: string) {
    removeUserPart(id)
    // If the deleted part was active, fall back to the first demo part.
    if (currentPartId === id) {
      onSelectPart(partIds[0])
    }
  }

  return (
    <>
      <RibbonGroup bordered>
        <RibbonButton
          onClick={onUploadClick}
          icon={Upload}
          label="Upload STL"
          active={!!uploadedSTL}
        />
        {uploadedSTL && (
          <RibbonButton
            onClick={onClearUpload}
            icon={Box}
            label="Use Demo Part"
          />
        )}
      </RibbonGroup>
      {userParts.length > 0 && (
        <RibbonGroup bordered>
          {userParts.map((part) => (
            <ContextMenu key={part.id}>
              <ContextMenuTrigger asChild>
                <span>
                  <RibbonButton
                    icon={part.kind === 'ai-created' ? Sparkles : Upload}
                    label={part.label}
                    active={currentPartId === part.id}
                    onClick={() => void selectUserPart(part)}
                  />
                </span>
              </ContextMenuTrigger>
              <ContextMenuContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
                <ContextMenuItem
                  variant="destructive"
                  onClick={() => handleDelete(part.id)}
                >
                  Delete "{part.label}"
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}
        </RibbonGroup>
      )}
      <RibbonGroup>
        {partIds.map((id) => (
          <RibbonButton
            key={id}
            icon={FolderOpen}
            label={getDashboardAnalysis(id)?.partName ?? id}
            active={!uploadedSTL && currentPartId === id}
            onClick={() => onSelectPart(id)}
          />
        ))}
      </RibbonGroup>
    </>
  )
}

function MarkupRibbon({
  suggestions,
  loading,
  onAccept,
  onPreview,
}: {
  suggestions: DesignProposal[]
  loading: boolean
  onAccept: (proposal: DesignProposal) => void
  onPreview: () => void
}) {
  return (
    <RibbonGroup>
      {loading && suggestions.length === 0 && (
        <span className="text-xs text-zinc-500 px-3 py-3 self-center">
          Generating optimizations…
        </span>
      )}
      {!loading && suggestions.length === 0 && (
        <span className="text-xs text-zinc-500 px-3 py-3 self-center">
          Ask the AI to suggest improvements — they&apos;ll appear here
        </span>
      )}
      {suggestions.map((s) => (
        <RibbonButton
          key={s.id}
          icon={Sparkles}
          label={s.title}
          active={s.status === 'accepted'}
          onClick={() => {
            if (s.status === 'pending') {
              onAccept(s)
            } else {
              onPreview()
            }
          }}
        />
      ))}
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
        <RibbonLink href="/analysis/costing" icon={DollarSign} label="Cost Analysis" />
        <RibbonLink
          href="/analysis/on-demand"
          icon={Factory}
          label="Local Manufacturing"
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
      className={`flex items-stretch gap-0.5 px-2 ${
        bordered ? 'border-r border-zinc-800' : ''
      }`}
    >
      {children}
    </div>
  )
}

// Ribbon entries are full-height cards inside the ribbon row. Icons
// glue to the top padding of every card (uniform top axis across the
// row) and the label sits a fixed 12 px below — close enough to feel
// related, far enough not to crowd the icon. Variable-length labels
// just extend further down inside the same fixed-height button; we
// no longer try to bottom-align them because that left huge dead
// space under single-line labels.
const RIBBON_CARD =
  'flex h-full w-[78px] flex-col items-center justify-start gap-3 rounded px-1 py-2 transition-colors'
const RIBBON_LABEL = 'text-[11px] leading-tight text-center break-words'

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
    <Link href={href} className={`${RIBBON_CARD} text-zinc-300 hover:bg-zinc-800`} title={label}>
      <Icon className="size-6 text-zinc-300" />
      <span className={`${RIBBON_LABEL} text-zinc-400`}>{label}</span>
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
      className={`${RIBBON_CARD} ${
        active ? 'bg-blue-600/80 hover:bg-blue-600 text-white' : 'text-zinc-300 hover:bg-zinc-800'
      }`}
      title={label}
    >
      <Icon className="size-6" />
      <span className={RIBBON_LABEL}>{label}</span>
    </button>
  )
}
