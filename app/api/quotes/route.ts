import { NextResponse } from 'next/server'

/**
 * Quote-request endpoint. In production this would persist to a shared
 * database (and forward the part + DFM report to the molder's email or
 * Slack). For the demo we keep a process-local in-memory queue so the
 * /shop page can show recently submitted leads.
 */
export interface QuoteRequest {
  shopName: string
  shopZip?: string
  designerEmail?: string
  partName: string
  material: string
  productionQuantity: number
  estimateTooling: number
  estimatePerPart: number
  estimateLeadWeeks: number
  dfmScore?: number
  notes?: string
}

export interface StoredQuote extends QuoteRequest {
  id: string
  receivedAt: string
  status: 'new' | 'reviewing' | 'quoted' | 'declined'
}

const STORE: { quotes: StoredQuote[] } = {
  quotes: seedDemoQuotes(),
}

function seedDemoQuotes(): StoredQuote[] {
  const now = Date.now()
  // Two seed leads so the molder portal isn't empty on first visit.
  return [
    {
      id: 'q-seed-1',
      receivedAt: new Date(now - 1000 * 60 * 90).toISOString(),
      status: 'new',
      shopName: 'Great Lakes Plastics',
      shopZip: '49503',
      designerEmail: 'design@acme-bracket.io',
      partName: 'Plastic Bracket — bracket.stl',
      material: 'ABS',
      productionQuantity: 5000,
      estimateTooling: 18500,
      estimatePerPart: 0.42,
      estimateLeadWeeks: 5,
      dfmScore: 78,
      notes: 'Looking for bridge tooling, willing to switch to glass-filled if cost is similar.',
    },
    {
      id: 'q-seed-2',
      receivedAt: new Date(now - 1000 * 60 * 60 * 6).toISOString(),
      status: 'reviewing',
      shopName: 'Detroit Mold & Tool',
      shopZip: '48312',
      designerEmail: 'jordan@nightlight-co.com',
      partName: 'Phone Case Back — phone_case.stl',
      material: 'PC',
      productionQuantity: 50000,
      estimateTooling: 41200,
      estimatePerPart: 0.88,
      estimateLeadWeeks: 9,
      dfmScore: 71,
      notes: 'High-volume run for Q3 launch.',
    },
  ]
}

export async function GET() {
  return NextResponse.json({
    quotes: [...STORE.quotes].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)),
  })
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<QuoteRequest>

  if (!body.shopName || !body.partName) {
    return NextResponse.json(
      { error: 'shopName and partName are required.' },
      { status: 400 }
    )
  }

  const quote: StoredQuote = {
    id: `q-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    receivedAt: new Date().toISOString(),
    status: 'new',
    shopName: body.shopName,
    shopZip: body.shopZip,
    designerEmail: body.designerEmail,
    partName: body.partName,
    material: body.material ?? 'unspecified',
    productionQuantity: body.productionQuantity ?? 0,
    estimateTooling: body.estimateTooling ?? 0,
    estimatePerPart: body.estimatePerPart ?? 0,
    estimateLeadWeeks: body.estimateLeadWeeks ?? 0,
    dfmScore: body.dfmScore,
    notes: body.notes,
  }
  STORE.quotes.unshift(quote)
  return NextResponse.json({ ok: true, quote })
}

export async function PATCH(req: Request) {
  const body = (await req.json()) as { id: string; status: StoredQuote['status'] }
  const quote = STORE.quotes.find((q) => q.id === body.id)
  if (!quote) return NextResponse.json({ error: 'not found' }, { status: 404 })
  quote.status = body.status
  return NextResponse.json({ ok: true, quote })
}
