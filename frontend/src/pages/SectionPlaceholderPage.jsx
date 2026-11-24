import { ArrowLeft, Construction } from 'lucide-react'
import { Link } from 'react-router-dom'
import EmptyState from '../components/common/EmptyState.jsx'
import PageContainer from '../components/common/PageContainer.jsx'

export default function SectionPlaceholderPage({ title }) {
  return (
    <PageContainer
      description={`The ${title.toLowerCase()} workspace is part of the application navigation.`}
      title={title}
    >
      <EmptyState
        description="This section is a navigation placeholder in the frontend foundation. Its workflows will be added in a later operation and will use the existing backend API."
        icon={Construction}
        title={`${title} is not implemented yet`}
      >
        <Link
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          to="/"
        >
          <ArrowLeft aria-hidden="true" size={15} />
          Back to dashboard
        </Link>
      </EmptyState>
    </PageContainer>
  )
}
