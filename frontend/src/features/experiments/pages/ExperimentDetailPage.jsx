import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Copy,
  Database,
  Download,
  FileSpreadsheet,
  Layers,
  Loader2,
  Play,
  RotateCw,
  Shuffle,
  Sparkles,
} from 'lucide-react'
import ErrorState from '../../../components/common/ErrorState.jsx'
import LoadingState from '../../../components/common/LoadingState.jsx'
import PageContainer from '../../../components/common/PageContainer.jsx'
import {
  fetchExperiment,
  fetchExperimentPredictions,
  fetchExperimentReport,
  fetchExperimentResults,
  runExperiment,
} from '../api/experimentsApi.js'
import ExperimentStatusBadge from '../components/ExperimentStatusBadge.jsx'

export default function ExperimentDetailPage() {
  const { experimentId } = useParams()

  const [experiment, setExperiment] = useState(null)
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [running, setRunning] = useState(false)
  const [copiedId, setCopiedId] = useState(false)
  const [downloading, setDownloading] = useState(null) // 'results' | 'predictions' | 'report'

  async function loadExperimentDetails(showLoading = true) {
    if (showLoading) setLoading(true)
    setError(null)

    try {
      const data = await fetchExperiment(experimentId)
      setExperiment(data)

      if (data.status === 'completed') {
        try {
          const res = await fetchExperimentResults(experimentId)
          setResults(res)
        } catch (resErr) {
          console.warn('Could not load completed experiment results:', resErr)
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load experiment details.')
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  useEffect(() => {
    loadExperimentDetails(true)
  }, [experimentId])

  // Polling hook while status is queued or running
  useEffect(() => {
    if (!experiment) return
    const isPending = experiment.status === 'queued' || experiment.status === 'running'
    if (!isPending) return

    const interval = setInterval(() => {
      loadExperimentDetails(false)
    }, 2000)

    return () => clearInterval(interval)
  }, [experiment?.status])

  async function handleStart() {
    if (running) return
    setRunning(true)
    try {
      await runExperiment(experimentId)
      await loadExperimentDetails(false)
    } catch (err) {
      alert(`Could not start experiment: ${err.message}`)
    } finally {
      setRunning(false)
    }
  }

  function handleCopyId() {
    if (!experiment?.experiment_id) return
    navigator.clipboard.writeText(experiment.experiment_id)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  async function handleDownload(type) {
    setDownloading(type)
    try {
      let blob
      let filename
      if (type === 'results') {
        blob = await fetchExperimentResults(experimentId, 'csv')
        filename = `${experimentId}-results.csv`
      } else if (type === 'predictions') {
        blob = await fetchExperimentPredictions(experimentId, 'csv')
        filename = `${experimentId}-predictions.csv`
      } else if (type === 'report') {
        blob = await fetchExperimentReport(experimentId, 'csv')
        filename = `${experimentId}-report.csv`
      }

      const url = window.URL.createObjectURL(new Blob([blob], { type: 'text/csv' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert(`Download failed: ${err.message}`)
    } finally {
      setDownloading(null)
    }
  }

  function formatDateTime(isoString) {
    if (!isoString) return '—'
    try {
      return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'medium',
      }).format(new Date(isoString))
    } catch {
      return isoString
    }
  }

  return (
    <PageContainer
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-700"
            to="/experiments"
          >
            <ArrowLeft aria-hidden="true" size={14} />
            Back to Experiments
          </Link>

          {experiment?.status === 'created' && (
            <button
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-50"
              disabled={running}
              onClick={handleStart}
              type="button"
            >
              {running ? (
                <>
                  <Loader2 aria-hidden="true" className="animate-spin" size={14} />
                  Queueing...
                </>
              ) : (
                <>
                  <Play aria-hidden="true" size={14} />
                  Execute Benchmark
                </>
              )}
            </button>
          )}

          <button
            aria-label="Refresh experiment status"
            className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            onClick={() => loadExperimentDetails(false)}
            title="Refresh status"
            type="button"
          >
            <RotateCw size={14} />
          </button>
        </div>
      }
      description={
        experiment
          ? `Created ${formatDateTime(experiment.created_at)} • Target: ${experiment.endpoint} (${experiment.units})`
          : 'Inspect QSAR benchmarking configurations, track live worker status, and evaluate model performance.'
      }
      eyebrow="Experiment Details"
      title={experiment ? `Experiment ${experiment.experiment_id.slice(0, 8)}` : 'Experiment Details'}
    >
      {loading ? (
        <LoadingState centered label="Retrieving experiment status and execution logs..." />
      ) : error ? (
        <ErrorState
          message={error}
          onRetry={() => loadExperimentDetails(true)}
          title="Could not load experiment"
        />
      ) : !experiment ? (
        <ErrorState message="The requested experiment was not found." title="Experiment Not Found" />
      ) : (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-semibold text-slate-900">
                    QSAR Benchmark Run
                  </h2>
                  <ExperimentStatusBadge status={experiment.status} />
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-mono">ID: {experiment.experiment_id}</span>
                  <button
                    className="text-slate-400 hover:text-slate-700"
                    onClick={handleCopyId}
                    title="Copy full experiment ID"
                    type="button"
                  >
                    <Copy size={13} />
                  </button>
                  {copiedId && <span className="text-emerald-700 font-medium">Copied!</span>}
                </div>
              </div>

              {/* Execution Timestamps */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
                  <span className="text-slate-400">Created: </span>
                  <span className="font-medium text-slate-800">{formatDateTime(experiment.created_at)}</span>
                </div>
                {experiment.started_at && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
                    <span className="text-slate-400">Started: </span>
                    <span className="font-medium text-slate-800">{formatDateTime(experiment.started_at)}</span>
                  </div>
                )}
                {experiment.completed_at && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-800">
                    <span className="text-emerald-600">Completed: </span>
                    <span className="font-medium">{formatDateTime(experiment.completed_at)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status Banners */}
          {experiment.status === 'running' && (
            <div className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50/80 p-4 text-xs text-amber-950 shadow-2xs animate-pulse">
              <Loader2 className="size-5 shrink-0 animate-spin text-amber-700" />
              <div>
                <p className="font-bold">Benchmarking in Progress</p>
                <p className="mt-0.5 text-amber-900">
                  The local scientific worker thread is generating molecular features, partitioning folds,
                  and evaluating model predictions. Results will display automatically upon completion.
                </p>
              </div>
            </div>
          )}

          {experiment.status === 'queued' && (
            <div className="flex items-center gap-3 rounded-xl border border-sky-300 bg-sky-50/80 p-4 text-xs text-sky-950 shadow-2xs">
              <Clock className="size-5 shrink-0 text-sky-700" />
              <div>
                <p className="font-bold">Queued for Execution</p>
                <p className="mt-0.5 text-sky-900">
                  Experiment is scheduled. Local execution is serialized with single-worker processing to guarantee reproducible benchmark runs.
                </p>
              </div>
            </div>
          )}

          {experiment.status === 'failed' && (
            <div className="flex items-start gap-3 rounded-xl border border-rose-300 bg-rose-50 p-4 text-xs text-rose-950 shadow-2xs">
              <AlertCircle className="size-5 shrink-0 text-rose-700 mt-0.5" />
              <div>
                <p className="font-bold">Experiment Execution Failed</p>
                <p className="mt-0.5 text-rose-900">
                  {experiment.error_summary || 'The experiment failed during validation or training.'}
                </p>
              </div>
            </div>
          )}

          {/* Configuration Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Dataset & Endpoint */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <Database className="size-4 text-teal-700" />
                <span>Dataset & Target</span>
              </div>
              <p className="mt-2 font-mono text-sm font-bold text-slate-900">
                {experiment.endpoint} ({experiment.units})
              </p>
              <div className="mt-1 text-xs text-slate-500">
                Dataset ID: <Link className="font-mono text-teal-800 underline" to={`/datasets/${experiment.dataset_id}`}>{experiment.dataset_id.slice(0, 8)}...</Link>
              </div>
            </div>

            {/* Split Strategy */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <Shuffle className="size-4 text-teal-700" />
                <span>Split Strategy</span>
              </div>
              <p className="mt-2 text-sm font-bold capitalize text-slate-900">
                {experiment.split_strategy} Split
              </p>
              <p className="mt-1 text-xs text-slate-500 font-mono">
                {Math.round(experiment.test_fraction * 100)}% Test • Seed {experiment.random_seed}
              </p>
            </div>

            {/* Feature Configuration */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <Sparkles className="size-4 text-teal-700" />
                <span>Features</span>
              </div>
              <p className="mt-2 text-sm font-bold text-slate-900">
                {experiment.feature_config?.include_descriptors ? 'Descriptors' : ''}
                {experiment.feature_config?.include_descriptors && experiment.feature_config?.include_morgan ? ' + ' : ''}
                {experiment.feature_config?.include_morgan ? 'Morgan (ECFP)' : ''}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {experiment.feature_config?.include_morgan
                  ? `Radius ${experiment.feature_config?.fingerprint?.radius}, ${experiment.feature_config?.fingerprint?.n_bits} bits`
                  : 'Physicochemical 1D/2D metrics'}
              </p>
            </div>

            {/* Models Selected */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <Layers className="size-4 text-teal-700" />
                <span>Estimators</span>
              </div>
              <p className="mt-2 text-sm font-bold text-slate-900">
                {experiment.selected_models?.length} Models
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {experiment.selected_models?.map((m) => (
                  <span className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[10px] text-slate-700" key={m}>
                    {m.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Results Summary Section (If completed) */}
          {experiment.status === 'completed' && results && (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Benchmark Evaluation Metrics
                  </h3>
                  <p className="text-xs text-slate-500">
                    Standardized performance scores across held-out test predictions
                  </p>
                </div>

                {/* Export actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    disabled={Boolean(downloading)}
                    onClick={() => handleDownload('results')}
                    type="button"
                  >
                    <Download size={13} />
                    {downloading === 'results' ? 'Exporting...' : 'Export Results CSV'}
                  </button>

                  <button
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    disabled={Boolean(downloading)}
                    onClick={() => handleDownload('predictions')}
                    type="button"
                  >
                    <Download size={13} />
                    {downloading === 'predictions' ? 'Exporting...' : 'Export Predictions CSV'}
                  </button>

                  <button
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    disabled={Boolean(downloading)}
                    onClick={() => handleDownload('report')}
                    type="button"
                  >
                    <Download size={13} />
                    {downloading === 'report' ? 'Exporting...' : 'Export Report CSV'}
                  </button>
                </div>
              </div>

              {/* Model metrics table */}
              <div
                aria-label="Model benchmark evaluation metrics"
                className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs"
                role="region"
                tabIndex={0}
              >
                <table className="w-full min-w-[600px] border-collapse text-left text-xs sm:text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                    <tr>
                      <th className="px-4 py-2.5" scope="col">
                        Estimator
                      </th>
                      <th className="px-4 py-2.5 text-right font-mono" scope="col">
                        R² Score
                      </th>
                      <th className="px-4 py-2.5 text-right font-mono" scope="col">
                        RMSE
                      </th>
                      <th className="px-4 py-2.5 text-right font-mono" scope="col">
                        MAE
                      </th>
                      <th className="px-4 py-2.5 text-right font-mono" scope="col">
                        Train Samples
                      </th>
                      <th className="px-4 py-2.5 text-right font-mono" scope="col">
                        Test Samples
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {results.models?.map((model) => (
                      <tr className="hover:bg-slate-50/70 transition-colors" key={model.name}>
                        <td className="px-4 py-2.5 font-bold font-mono text-xs text-slate-900">
                          {model.name}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs">
                          {model.metrics?.r2 !== null && model.metrics?.r2 !== undefined ? (
                            <span
                              className={`font-bold ${
                                model.metrics.r2 > 0.5
                                  ? 'text-emerald-700'
                                  : model.metrics.r2 > 0
                                    ? 'text-slate-800'
                                    : 'text-rose-700'
                              }`}
                            >
                              {model.metrics.r2.toFixed(4)}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-800">
                          {model.metrics?.rmse?.toFixed(4) ?? '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-800">
                          {model.metrics?.mae?.toFixed(4) ?? '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-600">
                          {model.training_sample_count}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-600">
                          {model.test_sample_count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  )
}
