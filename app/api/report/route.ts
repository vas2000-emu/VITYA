import { NextResponse, type NextRequest } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { MoldLocalReport } from '@/components/results/PDFReport'
import { getDashboardAnalysis, partsLibrary } from '@/lib/mockMoldAnalysis'
import type { PartId } from '@/lib/types'

/**
 * GET /api/report?partId=<bracket|phoneCase|droneArm>&fixed=<comma,separated,ids>
 *
 * Streams a PDF rendering of the MoldLocal report for the requested
 * part. `fixed` is optional — pass the comma-separated list of issue
 * IDs the user has marked applied so the PDF reflects their current
 * state (otherwise the baseline is reported).
 *
 * Runs on the Node runtime (react-pdf needs Node APIs); we set runtime
 * = "nodejs" to be explicit.
 */
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const requestedId = (url.searchParams.get('partId') ?? 'bracket') as PartId
  const analysis = getDashboardAnalysis(requestedId) ?? partsLibrary.bracket

  const fixedParam = url.searchParams.get('fixed') ?? ''
  const fixedIssueIds = fixedParam
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const buffer = await renderToBuffer(
    MoldLocalReport({ analysis, fixedIssueIds }),
  )

  const filename = `moldlocal-${analysis.partId}-${new Date()
    .toISOString()
    .slice(0, 10)}.pdf`

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
