import { ResultsDashboard } from '@/components/results/ResultsDashboard'

// MoldLocal results dashboard route.
//
// This page renders the interactive results dashboard for an analyzed part.
// The dashboard reads its data from `useResultsStore`, which currently
// hydrates from mock data in `lib/mockMoldAnalysis.ts`. When the backend
// (CAD parsing + AI suggestions + supplier RAG) is wired up, swap the
// mock import for a real fetch and the rest of the UI keeps working.
//
// See `lib/backendAdapter.ts` for the response-shape mapping helper.
export default function ResultsPage() {
  return <ResultsDashboard />
}
