'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ChevronLeft,
  Factory,
  Mail,
  Clock,
  DollarSign,
  Loader2,
  CheckCircle2,
  CircleSlash,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import type { StoredQuote } from '@/app/api/quotes/route'

/**
 * Molder-side inbox of quote requests. Mirror of /results but inverted:
 * /results is the designer's DFM dashboard, /shop is the molder's lead
 * queue. Marketplace play — see project_vitya_direction memory.
 *
 * Reads/writes to the in-memory store in app/api/quotes/route.ts.
 */
export default function ShopPortalPage() {
  const [quotes, setQuotes] = useState<StoredQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/quotes', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as { quotes: StoredQuote[] }
      setQuotes(json.quotes)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quotes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const updateStatus = async (id: string, status: StoredQuote['status']) => {
    try {
      const res = await fetch('/api/quotes', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success(`Marked ${status}`)
      void refresh()
    } catch (err) {
      toast.error('Failed to update', { description: err instanceof Error ? err.message : '' })
    }
  }

  const newCount = quotes.filter((q) => q.status === 'new').length
  const reviewingCount = quotes.filter((q) => q.status === 'reviewing').length
  const quotedCount = quotes.filter((q) => q.status === 'quoted').length

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="flex items-center justify-between px-6 py-3 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1 px-2 py-1.5 text-sm hover:bg-zinc-800 rounded"
          >
            <ChevronLeft className="size-4" />
            <span>Back</span>
          </Link>
          <div className="h-5 w-px bg-zinc-800" />
          <Factory className="size-4 text-violet-300" />
          <h1 className="text-sm font-medium">Molder Portal</h1>
          <span className="text-xs text-zinc-500">Leads from the MoldLocal designer marketplace</span>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="flex items-center gap-2 px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 rounded"
        >
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Stat label="New leads" value={newCount} tone="rose" />
          <Stat label="Reviewing" value={reviewingCount} tone="amber" />
          <Stat label="Quoted" value={quotedCount} tone="emerald" />
        </div>

        {error && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        {loading && quotes.length === 0 ? (
          <div className="flex items-center gap-3 py-8 text-zinc-500">
            <Loader2 className="size-4 animate-spin" />
            Loading leads…
          </div>
        ) : quotes.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="space-y-3">
            {quotes.map((q) => (
              <li
                key={q.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-100 truncate">
                        {q.partName}
                      </span>
                      <StatusBadge status={q.status} />
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      Routed to <span className="text-zinc-300">{q.shopName}</span>
                      {q.shopZip && ` · ${q.shopZip}`}
                      {q.designerEmail && (
                        <>
                          {' · '}
                          <span className="inline-flex items-center gap-1">
                            <Mail className="size-3" /> {q.designerEmail}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] text-zinc-500 shrink-0">
                    {timeAgo(q.receivedAt)}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                  <Cell label="Material">{q.material}</Cell>
                  <Cell label="Quantity">{q.productionQuantity.toLocaleString()}</Cell>
                  <Cell label="Tooling" icon={<DollarSign className="size-3" />}>
                    ${q.estimateTooling.toLocaleString()}
                  </Cell>
                  <Cell label="Per part">${q.estimatePerPart.toFixed(2)}</Cell>
                  <Cell label="Lead" icon={<Clock className="size-3" />}>
                    {q.estimateLeadWeeks} wk
                  </Cell>
                </div>

                {q.notes && (
                  <div className="text-xs text-zinc-400 italic border-l-2 border-zinc-700 pl-3">
                    “{q.notes}”
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  <ActionButton
                    onClick={() => updateStatus(q.id, 'reviewing')}
                    disabled={q.status === 'reviewing'}
                    icon={<Loader2 className="size-3.5" />}
                  >
                    Mark reviewing
                  </ActionButton>
                  <ActionButton
                    onClick={() => updateStatus(q.id, 'quoted')}
                    disabled={q.status === 'quoted'}
                    icon={<CheckCircle2 className="size-3.5" />}
                    tone="emerald"
                  >
                    Send quote
                  </ActionButton>
                  <ActionButton
                    onClick={() => updateStatus(q.id, 'declined')}
                    disabled={q.status === 'declined'}
                    icon={<CircleSlash className="size-3.5" />}
                    tone="rose"
                  >
                    Decline
                  </ActionButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}

function StatusBadge({ status }: { status: StoredQuote['status'] }) {
  const map: Record<StoredQuote['status'], string> = {
    new: 'border-rose-500/40 bg-rose-500/15 text-rose-200',
    reviewing: 'border-amber-500/40 bg-amber-500/15 text-amber-200',
    quoted: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200',
    declined: 'border-zinc-700 bg-zinc-800 text-zinc-400',
  }
  return (
    <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${map[status]}`}>
      {status}
    </span>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'rose' | 'amber' | 'emerald'
}) {
  const toneCls = {
    rose: 'border-rose-500/40 bg-rose-500/10 text-rose-200',
    amber: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
    emerald: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  }[tone]
  return (
    <div className={`rounded-lg border p-4 ${toneCls}`}>
      <div className="text-[11px] uppercase tracking-wider opacity-80">{label}</div>
      <div className="text-3xl font-mono mt-1">{value}</div>
    </div>
  )
}

function Cell({
  label,
  icon,
  children,
}: {
  label: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5">
      <div className="flex items-center gap-1 text-zinc-500 mb-0.5">
        {icon}
        <span className="uppercase tracking-wider text-[9px]">{label}</span>
      </div>
      <div className="text-zinc-100 font-mono text-xs">{children}</div>
    </div>
  )
}

function ActionButton({
  onClick,
  disabled,
  icon,
  tone,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  icon: React.ReactNode
  tone?: 'emerald' | 'rose'
  children: React.ReactNode
}) {
  const toneCls =
    tone === 'emerald'
      ? 'bg-emerald-600/80 hover:bg-emerald-500 text-white'
      : tone === 'rose'
        ? 'bg-rose-600/80 hover:bg-rose-500 text-white'
        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${toneCls}`}
    >
      {icon}
      {children}
    </button>
  )
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center text-zinc-500">
      <Factory className="size-8 mx-auto opacity-50 mb-3" />
      <div className="text-sm">No leads yet.</div>
      <div className="text-xs mt-1">
        Quote requests submitted by designers will appear here.
      </div>
    </div>
  )
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}
