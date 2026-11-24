import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageContainer from '../components/common/PageContainer.jsx'

export default function NotFoundPage() {
  return (
    <PageContainer
      description="The address may be outdated or the page may have moved."
      title="Page not found"
    >
      <section className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-600">
          We could not find a page at this address.
        </p>
        <Link
          className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#123047] px-4 text-sm font-medium text-white hover:bg-[#1b455f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          to="/"
        >
          <ArrowLeft aria-hidden="true" size={15} />
          Return to dashboard
        </Link>
      </section>
    </PageContainer>
  )
}
