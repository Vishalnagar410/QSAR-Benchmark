import {
  Activity,
  ArrowRight,
  ClipboardCheck,
  Database,
  FlaskConical,
  History,
  Layers3,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import EmptyState from '../components/common/EmptyState.jsx'
import PageContainer from '../components/common/PageContainer.jsx'
import SectionHeader from '../components/common/SectionHeader.jsx'
import StatCard from '../components/common/StatCard.jsx'

const workflow = [
  {
    title: 'Prepare a dataset',
    description:
      'Bring a CSV into the workspace and define the endpoint and units you intend to study.',
    icon: Database,
    to: '/datasets',
  },
  {
    title: 'Review data quality',
    description:
      'Inspect structure parsing, record exclusions, and duplicate-structure diagnostics.',
    icon: ClipboardCheck,
    to: '/validation',
  },
  {
    title: 'Explore a benchmark',
    description:
      'Configure features and leakage-aware baseline experiments for a selected dataset.',
    icon: FlaskConical,
    to: '/experiments',
  },
]

export default function DashboardPage() {
  return (
    <PageContainer
      description="A local workspace for transparent, leakage-aware QSAR benchmarking."
      eyebrow="Research workspace"
      title="Welcome to QSAR-Benchmark"
    >
      <section
        aria-label="Workspace summary"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          description="Appears when datasets are connected."
          emptyLabel="Awaiting workspace data"
          icon={Database}
          label="Datasets"
        />
        <StatCard
          description="Appears when experiments are connected."
          emptyLabel="Awaiting workspace data"
          icon={FlaskConical}
          label="Experiments"
        />
        <StatCard
          description="Appears when completed runs are connected."
          emptyLabel="Awaiting workspace data"
          icon={Activity}
          label="Completed runs"
        />
        <StatCard
          description="No benchmark metrics are shown without run data."
          emptyLabel="No results available"
          icon={Layers3}
          label="Benchmark results"
        />
      </section>

      <section aria-label="Workspace overview" className="mt-9 grid gap-6 xl:grid-cols-2">
        <div>
          <SectionHeader
            description="Recent datasets will be listed here when dataset workflows are available."
            title="Dataset overview"
            action={
              <Link
                className="inline-flex min-h-10 items-center gap-1 rounded-lg px-3 text-sm font-medium text-teal-800 transition-colors hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                to="/datasets"
              >
                Datasets
                <ArrowRight aria-hidden="true" size={15} />
              </Link>
            }
          />
          <EmptyState
            description="Dataset summaries are not connected in this shell. No sample records are displayed."
            icon={Database}
            title="No dataset overview available"
          />
        </div>
        <div>
          <SectionHeader
            description="Experiment status and results will appear when those workflows are available."
            title="Experiment overview"
            action={
              <Link
                className="inline-flex min-h-10 items-center gap-1 rounded-lg px-3 text-sm font-medium text-teal-800 transition-colors hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                to="/experiments"
              >
                Experiments
                <ArrowRight aria-hidden="true" size={15} />
              </Link>
            }
          />
          <EmptyState
            description="No experiment metrics, scores, or activity are shown until real backend data is connected."
            icon={FlaskConical}
            title="No experiment overview available"
          />
        </div>
      </section>

      <section aria-labelledby="activity-title" className="mt-9">
        <SectionHeader
          description="This activity feed will reflect real workspace events when available."
          id="activity-title"
          title="Recent activity"
        />
        <EmptyState
          description="There is no connected activity history to display yet."
          icon={History}
          title="No recent activity"
        />
      </section>

      <section aria-labelledby="workflow-title" className="mt-9">
        <SectionHeader
          description="Each step builds on validated, traceable molecular records."
          id="workflow-title"
          title="Quick navigation"
        />
        <div className="grid gap-4 xl:grid-cols-3">
          {workflow.map(({ title, description, icon: Icon, to }) => (
            <Link
              className="group flex min-h-40 min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-teal-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
              key={to}
              to={to}
            >
              <span className="flex size-9 items-center justify-center rounded-lg bg-teal-50 text-teal-800">
                <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
              </span>
              <h3 className="mt-4 text-sm font-semibold text-slate-900">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {description}
              </p>
              <span className="mt-auto inline-flex items-center gap-1 pt-4 text-xs font-semibold text-teal-800">
                Open section
                <ArrowRight
                  aria-hidden="true"
                  className="transition-transform group-hover:translate-x-0.5"
                  size={14}
                />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </PageContainer>
  )
}
