import { Triangle } from 'lucide-react'
import { AnalysisPageLayout } from '@/components/analysis/AnalysisPageLayout'
import { IssueAnalysisDetail } from '@/components/analysis/IssueAnalysisDetail'

export default function DraftAnalysisPage() {
  return (
    <AnalysisPageLayout
      title="Draft Analysis"
      subtitle="Check that vertical faces are tapered enough for the part to release cleanly from the mold cavity. Most Michigan molders look for at least 1-3 degrees of draft on shut-off surfaces."
      icon={Triangle}
      accent="amber"
    >
      <IssueAnalysisDetail issueId="draft-1" />
    </AnalysisPageLayout>
  )
}
