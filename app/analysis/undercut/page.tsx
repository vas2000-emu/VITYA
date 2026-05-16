import { Box } from 'lucide-react'
import { AnalysisPageLayout } from '@/components/analysis/AnalysisPageLayout'
import { IssueAnalysisDetail } from '@/components/analysis/IssueAnalysisDetail'

export default function UndercutAnalysisPage() {
  return (
    <AnalysisPageLayout
      title="Undercut Analysis"
      subtitle="Find geometry that would trap a single-pull mold and require side actions, lifters, or tooling complications that drive up cost and lead time."
      icon={Box}
      accent="rose"
    >
      <IssueAnalysisDetail issueId="undercut-1" />
    </AnalysisPageLayout>
  )
}
