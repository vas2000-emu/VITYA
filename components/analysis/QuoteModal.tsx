'use client'

import { useEffect, useState } from 'react'
import { Factory, Loader2, X, CheckCircle2, Mail, Clock, DollarSign, Phone } from 'lucide-react'
import { toast } from 'sonner'

interface Shop {
  name: string
  location: string
  leadTime: string
}

interface QuoteEstimate {
  tooling: number // dollars
  perPart: number // dollars
  leadWeeks: number
}

/**
 * Fake supplier quote handshake. When opened, runs a ~3s "sending part to
 * <shop>…" sequence (mock fetch). Then reveals the quote payload with
 * Confirm-and-email / Save buttons (both stubbed).
 *
 * Real version would POST a STEP file + DFM report to the shop's quote
 * endpoint and wait for an actual quote ID — but for the prototype this
 * sells the "moldlocal closes the loop with suppliers" narrative.
 */
export function QuoteModal({
  open,
  onClose,
  shop,
  estimate,
}: {
  open: boolean
  onClose: () => void
  shop: Shop | null
  estimate: QuoteEstimate
}) {
  const [phase, setPhase] = useState<'sending' | 'ready' | 'confirmed'>('sending')

  useEffect(() => {
    if (!open || !shop) return
    setPhase('sending')
    const t = setTimeout(() => setPhase('ready'), 2800)
    return () => clearTimeout(t)
  }, [open, shop])

  if (!open || !shop) return null

  const handleConfirm = () => {
    setPhase('confirmed')
    toast.success('Quote request sent', {
      description: `${shop.name} will reply within 24h.`,
    })
    setTimeout(() => onClose(), 1200)
  }

  return (
    <button
      type="button"
      aria-label="Close quote dialog"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 backdrop-blur-sm p-4 cursor-default"
    >
      <button
        type="button"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 shadow-xl text-left cursor-default"
        aria-label="Quote dialog content"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="size-7 rounded-md bg-violet-500/15 border border-violet-500/40 flex items-center justify-center">
              <Factory className="size-3.5 text-violet-300" />
            </span>
            <h2 className="text-sm font-medium text-zinc-100">Request a quote</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-zinc-800 rounded"
            aria-label="Close"
          >
            <X className="size-4 text-zinc-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">Supplier</div>
            <div className="text-sm font-medium text-zinc-100">{shop.name}</div>
            <div className="text-xs text-zinc-500">{shop.location}</div>
          </div>

          {phase === 'sending' && (
            <div className="flex items-center gap-3 py-3">
              <Loader2 className="size-4 animate-spin text-violet-300" />
              <div className="text-sm text-zinc-300">
                Sending part + DFM report to {shop.name}…
              </div>
            </div>
          )}

          {phase !== 'sending' && (
            <>
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-start gap-2">
                <CheckCircle2 className="size-4 text-emerald-300 mt-0.5 shrink-0" />
                <div className="text-xs text-emerald-200">
                  Quote received. Reply expected within 24h.
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <QuoteCell icon={<DollarSign className="size-3.5" />} label="Tooling">
                  ${estimate.tooling.toLocaleString()}
                </QuoteCell>
                <QuoteCell icon={<DollarSign className="size-3.5" />} label="Per part">
                  ${estimate.perPart.toFixed(2)}
                </QuoteCell>
                <QuoteCell icon={<Clock className="size-3.5" />} label="Lead time">
                  {estimate.leadWeeks} wk
                </QuoteCell>
              </div>

              <div className="text-[11px] text-zinc-500 leading-relaxed">
                Estimate is non-binding. Final pricing depends on the shop&apos;s
                own DFM review, current capacity, and resin pricing.
              </div>
            </>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 py-2 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded transition-colors"
            >
              Cancel
            </button>
            {phase === 'ready' && (
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-xs bg-violet-600 hover:bg-violet-500 text-white rounded transition-colors"
              >
                <Mail className="size-3.5" />
                Confirm &amp; email
              </button>
            )}
            {phase === 'confirmed' && (
              <button
                type="button"
                disabled
                className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-xs bg-emerald-600/60 text-white rounded cursor-default"
              >
                <Phone className="size-3.5" />
                Sent — they&apos;ll be in touch
              </button>
            )}
          </div>
        </div>
      </button>
    </button>
  )
}

function QuoteCell({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-2">
      <div className="flex items-center gap-1 text-zinc-500 mb-1">
        {icon}
        <span className="uppercase tracking-wider text-[10px]">{label}</span>
      </div>
      <div className="text-zinc-100 font-medium">{children}</div>
    </div>
  )
}
