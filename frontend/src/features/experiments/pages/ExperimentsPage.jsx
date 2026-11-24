import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  Database,
  Layers,
  Play,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react'
import EmptyState from '../../../components/common/EmptyState.jsx'
import ErrorState from '../../../components/common/ErrorState.jsx'
import LoadingState from '../../../components/common/LoadingState.jsx'
import PageContainer from '../../../components/common/PageContainer.jsx'
import SearchInput from '../../../components/common/SearchInput.jsx'
import { fetchExperiments, runExperiment } from '../api/experimentsApi.js'
import ExperimentStatusBadge from '../components/ExperimentStatusBadge.jsx'

export default function ExperimentsPage() {
  const [experiments, setExperiments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [startingExperimentId, setStartingExperimentId] = useState(null)

  const navigate = useNavigate()

  async function loadExperiments(showLoading = true) {
    if (showLoading) setLoading(true)
    setError(null)
    try {
      const data = await fetchExperiments()
      setDatasetsOrExperiments(data)
    } catch (err) {
      setError(err.message || 'Failed to load experiments.')
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  function setDatasetsOrExperiments(data) {
    setExperiments(data)
  }

  useEffect(() => {
    loadExperiments(true)
  }, [])

  // Auto-poll if any experiment is currently queued or running
  useEffect(() => {
    const hasActiveRuns = experiments.some(
      (e) => e.status === 'queued' || e.status === 'running',
    )
    if (!hasActiveRuns) return

    const interval = setInterval(() => {
      loadExperiments(false)
    }, 2500)

    return () => clearInterval(interval)
  }, [experiments])

  const filteredExperiments = useMemo(() => {
    return experiments.filter((exp) => {
      // Status filter
      if (statusFilter !== 'all' && exp.status !== statusFilter) {
        return false
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase()
        const idMatch = exp.experiment_id?.toLowerCase().includes(query)
        const endpointMatch = exp.endpoint?.toLowerCase().includes(query)
        const splitMatch = exp.split_strategy?.toLowerCase().includes(query)
        if (!idMatch && !endpointMatch && !splitMatch) return false
      }

      return true
    })
  }, [experiments, statusFilter, searchQuery])

  async function handleRun(e, experimentId) {
    e.stopPropagation()
    setStartingExperimentId(experimentId)
    try {
      await runExperiment(experimentId)
      await loadExperiments(false)
      navigate(`/experiments/${experimentId}`)
    } catch (err) {
      alert(`Could not start experiment: ${err.message}`)
    } finally {
      setStartingExperimentId(null)
    }
  }

  function formatDateTime(isoString) {
    if (!isoString) return '—'
    try {
      const date = new Date(isoString)
      return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date)
    } catch {
      return isoString
    }
  }

  return (
    <PageContainer
      actions={
        <div className="flex items-center gap-2">
          <button
            aria-label="Refresh experiments list"
            className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-700"
            disabled={loading}
            onClick={() => loadExperiments(true)}
            title="Refresh list"
            type="button"
          >
            <RefreshCw
              aria-hidden="true"
              className={loading ? 'animate-spin' : ''}
              size={15}
            />
          </button>
          <Link
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
            to="/experiments/new"
          >
            <Plus aria-hidden="true" size={16} />
            New Experiment
          </Link>
        </div>
      }
      description="Configure, launch, and monitor reproducible QSAR benchmarking experiments across machine learning estimators."
      eyebrow="Benchmarking"
      title="Experiments"
    >
      {loading && !experiments.length ? (
        <LoadingState centered label="Loading experiments..." />
      ) : error ? (
        <ErrorState
          message={error}
          onRetry={() => loadExperiments(true)}
          title="Could not retrieve experiments"
        />
      ) : !experiments.length ? (
        <EmptyState
          description="Create a benchmarking run to evaluate baseline, linear, and non-linear regression models on a validated chemical dataset."
          icon={Activity}
          title="No experiments configured yet"
        >
          <Link
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-teal-700"
            to="/experiments/new"
          >
            <Plus aria-hidden="true" size={16} />
            Configure Your First Experiment
          </Link>
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between shadow-2xs">
            <div className="w-full sm:w-80">
              <SearchInput
                onChange={setSearchQuery}
                placeholder="Search by ID, endpoint, split..."
                value={searchQuery}
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-500 mr-1">Status:</span>
              <button
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                onClick={() => setStatusFilter('all')}
                type="button"
              >
                All
              </button>
              <button
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                  statusFilter === 'completed'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
                onClick={() => setStatusFilter('completed')}
                type="button"
              >
                Completed
              </button>
              <button
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                  statusFilter === 'running' || statusFilter === 'queued'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 text-amber-900 hover:bg-amber-100'
                }`}
                onClick={() => setStatusFilter('running')}
                type="button"
              >
                Active
              </button>
              <button
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                  statusFilter === 'created'
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                onClick={() => setStatusFilter('created')}
                type="button"
              >
                Ready
              </button>
              <button
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                  statusFilter === 'failed'
                    ? 'bg-rose-700 text-white'
                    : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                }`}
                onClick={() => setStatusFilter('failed')}
                type="button"
              >
                Failed
              </button>
            </div>
          </div>

          {/* Table */}
          <div
            aria-label="Configured experiments"
            className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs focus-visible:outline-2 focus-visible:outline-teal-700"
            role="region"
            tabIndex={0}
          >
            <table className="w-full min-w-[850px] border-collapse text-left text-xs sm:text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-4 py-3" scope="col">
                    Experiment ID
                  </th>
                  <th className="px-4 py-3" scope="col">
                    Target Endpoint
                  </th>
                  <th className="px-4 py-3" scope="col" style={{ width: '130px' }}>
                    Split Strategy
                  </th>
                  <th className="px-4 py-3" scope="col">
                    Selected Models
                  </th>
                  <th className="px-4 py-3" scope="col" style={{ width: '150px' }}>
                    Status
                  </th>
                  <th className="px-4 py-3" scope="col" style={{ width: '170px' }}>
                    Created At
                  </th>
                  <th className="px-4 py-3 text-right" scope="col" style={{ width: '130px' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredExperiments.length ? (
                  filteredExperiments.map((exp) => (
                    <tr
                      className="transition-colors hover:bg-slate-50/70"
                      key={exp.experiment_id}
                    >
                      <td className="px-4 py-3">
                        <Link
                          className="font-mono font-semibold text-xs text-slate-900 hover:text-teal-800 hover:underline"
                          to={`/experiments/${exp.experiment_id}`}
                        >
                          {exp.experiment_id.slice(0, 8)}...
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono font-semibold text-xs text-slate-900">
                          {exp.endpoint}
                        </span>{' '}
                        <span className="text-xs text-slate-500">({exp.units})</span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-[11px] font-medium capitalize ${
                            exp.split_strategy === 'scaffold'
                              ? 'bg-teal-50 text-teal-800 border border-teal-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {exp.split_strategy} ({Math.round(exp.test_fraction * 100)}%)
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {exp.selected_models?.map((model) => (
                            <span
                              className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-700"
                              key={model}
                            >
                              {model.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <ExperimentStatusBadge status={exp.status} />
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {formatDateTime(exp.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {exp.status === 'created' && (
                            <button
                              aria-label={`Run experiment ${exp.experiment_id.slice(0, 8)}`}
                              className="inline-flex items-center gap-1 rounded-md bg-teal-700 px-2 py-1 text-xs font-semibold text-white shadow-2xs hover:bg-teal-800"
                              disabled={startingExperimentId === exp.experiment_id}
                              onClick={(e) => handleRun(e, exp.experiment_id)}
                              title="Start execution"
                              type="button"
                            >
                              <Play size={12} />
                              {startingExperimentId === exp.experiment_id ? 'Starting...' : 'Run'}
                            </button>
                          )}
                          <Link
                            aria-label={`View experiment ${exp.experiment_id.slice(0, 8)}`}
                            className="inline-flex size-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            title="Explore Details"
                            to={`/experiments/${exp.experiment_id}`}
                          >
                            <ArrowRight size={14} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      className="px-4 py-10 text-center text-sm text-slate-500"
                      colSpan={7}
                    >
                      No experiments match the filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageContainer>
  )
}
