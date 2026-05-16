'use client'

import { CheckCircle2, AlertTriangle, Circle, MapPin } from 'lucide-react'
import { useResultsStore } from '@/store/useResultsStore'
import type { MoldChecklistStatus } from '@/lib/types'

const STATUS_ICONS: Record<MoldChecklistStatus, React.ReactNode> = {
  good: <CheckCircle2 className="size-4 text-emerald-400" />,
  attention: <AlertTriangle className="size-4 text-amber-400" />,
  action: <Circle className="size-4 text-rose-400" />,
}

const STATUS_LABEL: Record<MoldChecklistStatus, string> = {
  good: 'On track',
  attention: 'Review',
  action: 'Needs work',
}

const STATUS_TONE: Record<MoldChecklistStatus, string> = {
  good: 'text-emerald-300',
  attention: 'text-amber-300',
  action: 'text-rose-300',
}

export function ReadinessChecklist() {
  const { analysis } = useResultsStore()
  const { checklist, supplierReadiness } = analysis

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
        <MapPin className="size-4 text-blue-400" />
        <div>
          <h2 className="text-sm font-medium text-zinc-100">
            {supplierReadiness.region} Manufacturing Readiness
          </h2>
          <p className="text-xs text-zinc-500">{supplierReadiness.status}</p>
        </div>
      </div>

      <ul className="divide-y divide-zinc-800">
        {checklist.map((item) => (
          <li key={item.id} className="flex items-center gap-3 px-4 py-3">
            <span className="shrink-0">{STATUS_ICONS[item.status]}</span>
            <span className="text-sm text-zinc-200 flex-1">{item.label}</span>
            <span
              className={`text-[10px] uppercase tracking-wider font-medium ${STATUS_TONE[item.status]}`}
            >
              {STATUS_LABEL[item.status]}
            </span>
          </li>
        ))}
      </ul>

      <div className="px-4 py-3 border-t border-zinc-800 bg-zinc-950/50">
        <p className="text-xs text-zinc-400 leading-relaxed">
          <span className="text-zinc-500">Supplier note:</span> {supplierReadiness.notes}
        </p>
      </div>
    </div>
  )
}
