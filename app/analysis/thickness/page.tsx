import { Layers3 } from 'lucide-react'
import { AnalysisPageLayout } from '@/components/analysis/AnalysisPageLayout'
import { IssueAnalysisDetail } from '@/components/analysis/IssueAnalysisDetail'

export default function ThicknessAnalysisPage() {
  return (
    <AnalysisPageLayout
      title="Thickness Analysis"
      subtitle="Look for thin or inconsistent walls that cause sink, warp, or short shots during injection. Wall thickness should usually stay between 2.0 mm and 3.5 mm and not vary more than ~25% across the part."
      icon={Layers3}
      accent="sky"
    >
      <IssueAnalysisDetail issueId="thin-wall-1" />
    </AnalysisPageLayout>
  )
}
