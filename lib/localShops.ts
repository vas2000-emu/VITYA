/**
 * Curated list of Michigan injection-molding shops. Shared by the
 * On-Demand Manufacturing page (visual list) and the AI chat tool
 * (programmatic lookup) so both surfaces give consistent answers when
 * a designer asks "who can make this near me?"
 *
 * Not a marketplace listing — VITYA is a design-aid tool. These are
 * resources the designer can choose to reach out to once their part
 * is design-ready.
 */
export interface LocalShop {
  name: string
  location: string
  zip: string
  capability: string
  leadTime: string
  notes: string
  /** Minimum DFM score for this shop to consider the part quote-ready. */
  minScore: number
}

export const LOCAL_SHOPS: LocalShop[] = [
  {
    name: 'Great Lakes Plastics',
    location: 'Grand Rapids, MI',
    zip: '49503',
    capability: 'Single-cavity prototype + bridge tooling',
    leadTime: '4-5 weeks',
    notes: 'Strong on small-to-medium snap-fit parts. Comfortable with side actions.',
    minScore: 60,
  },
  {
    name: 'Detroit Mold & Tool',
    location: 'Sterling Heights, MI',
    zip: '48312',
    capability: 'Production tooling, multi-cavity',
    leadTime: '8-10 weeks',
    notes: 'Best fit once volumes pass 25k pieces and the geometry is fixed.',
    minScore: 70,
  },
  {
    name: 'Lakeshore IM',
    location: 'Holland, MI',
    zip: '49423',
    capability: 'Engineering grade resins, glass-filled',
    leadTime: '5-6 weeks',
    notes: 'Pick this shop if the part switches to glass-filled nylon later.',
    minScore: 65,
  },
  {
    name: 'Midwest Precision Molding',
    location: 'Kalamazoo, MI',
    zip: '49001',
    capability: 'Low-volume production, rapid prototyping',
    leadTime: '3-4 weeks',
    notes: 'Great for fast turnaround on simpler geometries. Limited side-action capability.',
    minScore: 75,
  },
]

/** ZIP-prefix proximity: sort shops by absolute difference of the first
 *  3 digits of their ZIP from the user's. Works as a stand-in for a
 *  real geocoder in a Michigan-only dataset. */
export function rankByZipProximity(shops: LocalShop[], userZip: string): LocalShop[] {
  const target = parseInt(userZip.slice(0, 3), 10)
  if (Number.isNaN(target)) return shops
  return [...shops].sort((a, b) => {
    const da = Math.abs(parseInt(a.zip.slice(0, 3), 10) - target)
    const db = Math.abs(parseInt(b.zip.slice(0, 3), 10) - target)
    return da - db
  })
}

/** Query for the AI tool. Filters by min DFM score (so the part is
 *  actually quote-ready) and optionally ranks by ZIP proximity. */
export function findLocalShops({
  dfmScore,
  zip,
  limit = 4,
}: {
  dfmScore?: number
  zip?: string
  limit?: number
} = {}): LocalShop[] {
  let pool = LOCAL_SHOPS
  if (typeof dfmScore === 'number') {
    pool = pool.filter((s) => dfmScore >= s.minScore)
  }
  if (zip && /^\d{5}$/.test(zip)) {
    pool = rankByZipProximity(pool, zip)
  }
  return pool.slice(0, limit)
}
