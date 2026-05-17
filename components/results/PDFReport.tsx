/**
 * PDF report layout for the /results dashboard. Rendered server-side
 * via app/api/report/route.ts → renderToBuffer(), then streamed as
 * application/pdf so the user gets a real downloadable deliverable
 * without bundling react-pdf into the client bundle.
 */
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'
import { computeCurrentScore } from '@/store/useResultsStore'
import type { MoldAnalysisResult } from '@/lib/types'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    color: '#1f2937',
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#0f172a',
    paddingBottom: 12,
    marginBottom: 16,
  },
  brand: {
    fontSize: 14,
    fontWeight: 700,
    color: '#0f172a',
  },
  brandSub: {
    fontSize: 8,
    color: '#64748b',
    marginTop: 2,
  },
  meta: {
    alignItems: 'flex-end',
  },
  metaLine: {
    fontSize: 8,
    color: '#475569',
  },
  partRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  partTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#0f172a',
  },
  partSummary: {
    fontSize: 9,
    color: '#475569',
    marginTop: 4,
    maxWidth: 360,
  },
  scoreBadgeBox: {
    alignItems: 'flex-end',
  },
  scoreLabel: {
    fontSize: 8,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scoreValue: {
    fontSize: 26,
    fontWeight: 700,
    color: '#0f172a',
  },
  scoreSub: {
    fontSize: 8,
    color: '#64748b',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: '#0f172a',
    marginTop: 16,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricCard: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    padding: 8,
  },
  metricLabel: {
    fontSize: 7,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: 700,
    color: '#0f172a',
    marginTop: 2,
  },
  metricDesc: {
    fontSize: 8,
    color: '#475569',
    marginTop: 2,
  },
  issueCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    padding: 8,
    marginBottom: 6,
  },
  issueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  issueTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: '#0f172a',
  },
  severityPill: {
    fontSize: 7,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  severityHigh: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  severityMedium: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  severityLow: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  issueRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  issueLabel: {
    fontSize: 8,
    color: '#64748b',
    width: 90,
  },
  issueText: {
    fontSize: 8,
    color: '#1e293b',
    flex: 1,
  },
  scoreImpact: {
    fontSize: 8,
    fontWeight: 700,
    color: '#16a34a',
    marginTop: 4,
  },
  checklist: {
    marginTop: 4,
  },
  checklistRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  checklistDot: {
    width: 8,
    fontSize: 10,
    marginRight: 6,
  },
  checklistLabel: {
    fontSize: 9,
    color: '#1e293b',
    flex: 1,
  },
  checklistStatus: {
    fontSize: 8,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  supplierBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    padding: 10,
    marginTop: 6,
  },
  supplierStatus: {
    fontSize: 11,
    fontWeight: 700,
    color: '#0f172a',
  },
  supplierNotes: {
    fontSize: 9,
    color: '#475569',
    marginTop: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: '#94a3b8',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
  },
})

function severityStyle(sev: 'high' | 'medium' | 'low') {
  if (sev === 'high') return styles.severityHigh
  if (sev === 'medium') return styles.severityMedium
  return styles.severityLow
}

function statusGlyph(status: 'good' | 'attention' | 'action') {
  if (status === 'good') return '●' // filled circle
  if (status === 'attention') return '◎' // bullseye
  return '○' // empty circle
}

function statusColor(status: 'good' | 'attention' | 'action') {
  if (status === 'good') return '#16a34a'
  if (status === 'attention') return '#d97706'
  return '#dc2626'
}

export function MoldLocalReport({
  analysis,
  fixedIssueIds,
}: {
  analysis: MoldAnalysisResult
  fixedIssueIds: string[]
}) {
  const currentScore = computeCurrentScore(
    analysis.overallScore,
    analysis.improvedScore,
    fixedIssueIds,
    analysis.issues,
  )
  const generatedAt = new Date().toISOString().split('T')[0]

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>MoldLocal · Michigan readiness report</Text>
            <Text style={styles.brandSub}>
              AI-assisted moldability report for injection-molded parts
            </Text>
          </View>
          <View style={styles.meta}>
            <Text style={styles.metaLine}>Generated {generatedAt}</Text>
            <Text style={styles.metaLine}>Part ID: {analysis.partId}</Text>
            <Text style={styles.metaLine}>
              Fixes applied: {fixedIssueIds.length} / {analysis.issues.length}
            </Text>
          </View>
        </View>

        <View style={styles.partRow}>
          <View>
            <Text style={styles.partTitle}>{analysis.partName}</Text>
            <Text style={styles.partSummary}>{analysis.partSummary}</Text>
          </View>
          <View style={styles.scoreBadgeBox}>
            <Text style={styles.scoreLabel}>Current score</Text>
            <Text style={styles.scoreValue}>{currentScore}/100</Text>
            <Text style={styles.scoreSub}>Target {analysis.improvedScore}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Risk summary</Text>
        <View style={styles.metricsGrid}>
          {analysis.riskSummary.map((metric) => (
            <View key={metric.label} style={styles.metricCard}>
              <Text style={styles.metricLabel}>{metric.label}</Text>
              <Text style={styles.metricValue}>{metric.value}</Text>
              <Text style={styles.metricDesc}>{metric.description}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Detected issues</Text>
        {analysis.issues.map((issue) => {
          const isFixed = fixedIssueIds.includes(issue.id)
          return (
            <View key={issue.id} style={styles.issueCard}>
              <View style={styles.issueHeader}>
                <Text style={styles.issueTitle}>
                  {issue.title}
                  {isFixed ? ' ✓ fixed' : ''}
                </Text>
                <Text style={[styles.severityPill, severityStyle(issue.severity)]}>
                  {issue.severity}
                </Text>
              </View>
              <View style={styles.issueRow}>
                <Text style={styles.issueLabel}>Location</Text>
                <Text style={styles.issueText}>{issue.location}</Text>
              </View>
              <View style={styles.issueRow}>
                <Text style={styles.issueLabel}>Why it matters</Text>
                <Text style={styles.issueText}>{issue.whyItMatters}</Text>
              </View>
              <View style={styles.issueRow}>
                <Text style={styles.issueLabel}>Cost impact</Text>
                <Text style={styles.issueText}>{issue.costImpact}</Text>
              </View>
              <View style={styles.issueRow}>
                <Text style={styles.issueLabel}>Lead time impact</Text>
                <Text style={styles.issueText}>{issue.leadTimeImpact}</Text>
              </View>
              <View style={styles.issueRow}>
                <Text style={styles.issueLabel}>Recommendation</Text>
                <Text style={styles.issueText}>{issue.recommendation}</Text>
              </View>
              <Text style={styles.scoreImpact}>
                Score impact if fixed: {issue.scoreImpact}
              </Text>
            </View>
          )
        })}

        <Text style={styles.sectionTitle}>Readiness checklist</Text>
        <View style={styles.checklist}>
          {analysis.checklist.map((item) => (
            <View key={item.id} style={styles.checklistRow}>
              <Text style={[styles.checklistDot, { color: statusColor(item.status) }]}>
                {statusGlyph(item.status)}
              </Text>
              <Text style={styles.checklistLabel}>{item.label}</Text>
              <Text style={styles.checklistStatus}>
                {item.status === 'good' ? 'On track' : item.status === 'attention' ? 'Review' : 'Needs work'}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Supplier readiness — {analysis.supplierReadiness.region}</Text>
        <View style={styles.supplierBox}>
          <Text style={styles.supplierStatus}>{analysis.supplierReadiness.status}</Text>
          <Text style={styles.supplierNotes}>{analysis.supplierReadiness.notes}</Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>Generated by MoldLocal · prototype demo data</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
