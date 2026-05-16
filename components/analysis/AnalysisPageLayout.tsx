'use client'

import Link from 'next/link'
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface AnalysisPageLayoutProps {
  title: string
  subtitle: string
  icon: LucideIcon
  accent: 'rose' | 'amber' | 'sky' | 'emerald' | 'violet'
  children: React.ReactNode
}

const ACCENT_CLASSES: Record<AnalysisPageLayoutProps['accent'], string> = {
  rose: 'bg-rose-500/15 border-rose-500/40 text-rose-300',
  amber: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
  sky: 'bg-sky-500/15 border-sky-500/40 text-sky-300',
  emerald: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
  violet: 'bg-violet-500/15 border-violet-500/40 text-violet-300',
}

export function AnalysisPageLayout({
  title,
  subtitle,
  icon: Icon,
  accent,
  children,
}: AnalysisPageLayoutProps) {
  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-100">
      <header className="bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center justify-between px-4 py-2">
          <nav className="flex items-center gap-1">
            <Link
              href="/"
              className="flex items-center gap-1 px-2 py-1.5 text-sm hover:bg-zinc-800 rounded"
              title="Back to editor"
            >
              <ChevronLeft className="size-4" />
              <span>Back</span>
            </Link>

            <div className="h-6 w-px bg-zinc-700 mx-1" />

            <div className="flex items-center gap-2 px-2 py-1.5 text-sm">
              <span className="text-zinc-500">MoldLocal</span>
              <ChevronRight className="size-3 text-zinc-600" />
              <span className="text-zinc-500">Evaluate</span>
              <ChevronRight className="size-3 text-zinc-600" />
              <span className="text-zinc-100 font-medium">{title}</span>
            </div>
          </nav>

          <Link
            href="/results"
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 rounded text-sm font-medium text-white"
            title="View full Michigan readiness report"
          >
            <FileText className="size-4" />
            <span>Full report</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
          <div className="flex items-start gap-4">
            <span
              className={`shrink-0 size-12 rounded-lg border flex items-center justify-center ${ACCENT_CLASSES[accent]}`}
            >
              <Icon className="size-6" />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-zinc-100">{title}</h1>
              <p className="text-sm text-zinc-400 mt-1 max-w-2xl leading-relaxed">
                {subtitle}
              </p>
            </div>
          </div>

          {children}
        </div>
      </main>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared building blocks for analysis pages
// ---------------------------------------------------------------------------

export function StatBlock({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string
  value: string
  hint?: string
  tone?: 'default' | 'good' | 'warn' | 'bad'
}) {
  const toneClass = {
    default: 'text-zinc-100',
    good: 'text-emerald-300',
    warn: 'text-amber-300',
    bad: 'text-rose-300',
  }[tone]
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">
        {label}
      </div>
      <div className={`text-2xl font-semibold tabular-nums ${toneClass}`}>
        {value}
      </div>
      {hint && (
        <div className="text-xs text-zinc-500 mt-2 leading-relaxed">{hint}</div>
      )}
    </div>
  )
}

export function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800">
        <h2 className="text-sm font-medium text-zinc-100">{title}</h2>
        {description && (
          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}
