import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Database,
  Download,
  FileSpreadsheet,
  FlaskConical,
  Layers,
  Sparkles,
} from 'lucide-react'
import ErrorState from '../../../components/common/ErrorState.jsx'
import LoadingState from '../../../components/common/LoadingState.jsx'
import PageContainer from '../../../components/common/PageContainer.jsx'
import StatusBadge from '../../../components/common/StatusBadge.jsx'
import { fetchDataset, fetchValidationReport } from '../api/datasetsApi.js'
import DatasetValidationModal from '../components/DatasetValidationModal.jsx'
import DiagnosticsTable from '../components/DiagnosticsTable.jsx'
import DuplicateStructuresTable from '../components/DuplicateStructuresTable.jsx'
import FeatureGenerationPanel from '../components/FeatureGenerationPanel.jsx'
import QualityOverview from '../components/QualityOverview.jsx'

export default function DatasetDetailPage() {
  const { datasetId } = useParams()

  const [dataset, setDataset] = useState(null)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('quality') // 'quality' | 'audit' | 'duplicates' | 'features'

  const [validationModalOpen, setValidationModalOpen] = useState(false)
  const [copiedId, setCopiedId] = useState(false)
  const [downloadingReport, setDownloadingReport] = useState(false)

  async function loadData() {
    setLoading(true)
    setError(null)

    try {
      const meta = await fetchDataset(datasetId)
      setDataset(meta)

      if (meta.validation_status === 'validated' || meta.validation_status === 'invalid') {
        try {
          const rep = await fetchValidationReport(datasetId)
          setReport(rep)
        } catch {
          // Report might not exist if validation errored previously
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load dataset details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [datasetId])

  function handleCopyId() {
    if (!dataset?.dataset_id) return
    navigator.clipboard.writeText(dataset.dataset_id)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  async function handleDownloadReportCsv() {
    setDownloadingReport(true)
    try {
      const blob = await fetchValidationReport(datasetId, 'csv')
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'text/csv' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${datasetId}-validation.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert('Could not download validation report CSV: ' + err.message)
    } finally {
      setDownloadingReport(false)
    }
  }

  function handleValidationSuccess(newReport) {
    setReport(newReport)
    loadData()
  }

  return (
    <PageContainer
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-700"
            to="/datasets"
          >
            <ArrowLeft aria-hidden="true" size={14} />
            Back to Datasets
          </Link>

          {report && (
            <button
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-700"
              disabled={downloadingReport}
              onClick={handleDownloadReportCsv}
              type="button"
            >
              <Download aria-hidden="true" size={14} />
              {downloadingReport ? 'Downloading...' : 'Export Audit CSV'}
            </button>
          )}

          <button
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
            onClick={() => setValidationModalOpen(true)}
            type="button"
          >
            <ClipboardCheck aria-hidden="true" size={15} />
            {dataset?.validation_status === 'validated' ? 'Re-validate Dataset' : 'Validate Dataset'}
          </button>
        </div>
      }
      description={
        dataset
          ? `Dataset ID: ${dataset.dataset_id} • Uploaded ${new Date(dataset.uploaded_at).toLocaleDateString()}`
          : 'Inspect chemical records, review validation audit logs, and calculate molecular features.'
      }
      eyebrow="Dataset Explorer"
      title={dataset ? dataset.original_filename : 'Dataset Details'}
    >
      {loading ? (
        <LoadingState centered label="Retrieving dataset records and audit diagnostics..." />
      ) : error ? (
        <ErrorState
          message={error}
          onRetry={loadData}
          title="Could not load dataset details"
        />
      ) : !dataset ? (
        <ErrorState message="The requested dataset was not found in local storage." title="Dataset Not Found" />
      ) : (
        <div className="space-y-6">
          {/* Metadata Card Header */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <FileSpreadsheet aria-hidden="true" size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-slate-900">{dataset.original_filename}</h2>
                    <StatusBadge
                      dot
                      tone={
                        dataset.validation_status === 'validated'
                          ? 'success'
                          : dataset.validation_status === 'invalid'
                            ? 'error'
                            : 'neutral'
                      }
                    >
                      <span className="capitalize">{dataset.validation_status.replace('_', ' ')}</span>
                    </StatusBadge>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono">ID: {dataset.dataset_id}</span>
                    <button
                      className="text-slate-400 hover:text-slate-700"
                      onClick={handleCopyId}
                      title="Copy dataset ID"
                      type="button"
                    >
                      <Copy size={13} />
                    </button>
                    {copiedId && <span className="text-emerald-700 font-medium">Copied!</span>}
                  </div>
                </div>
              </div>

              {/* Quick stats pills */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-700 font-medium">
                  Total CSV Rows: <span className="font-mono font-bold text-slate-900">{dataset.record_count}</span>
                </div>
                {dataset.accepted_record_count !== null && dataset.accepted_record_count !== undefined && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-800 font-medium">
                    Accepted Compounds: <span className="font-mono font-bold">{dataset.accepted_record_count}</span>
                  </div>
                )}
                {dataset.endpoint && (
                  <div className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-teal-800 font-medium">
                    Endpoint: <span className="font-mono font-bold">{dataset.endpoint} {dataset.units ? `(${dataset.units})` : ''}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Validation Status Notice if Unvalidated */}
          {dataset.validation_status === 'not_validated' && !report && (
            <div className="rounded-xl border border-dashed border-teal-300 bg-teal-50/40 p-6 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
                <ClipboardCheck aria-hidden="true" size={24} />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-slate-900">
                Scientific Validation Required
              </h3>
              <p className="mx-auto mt-1 max-w-lg text-xs leading-relaxed text-slate-600">
                This dataset has been uploaded to local storage, but RDKit molecular structure parsing,
                exclusion audits, and duplicate detection have not been run yet.
              </p>
              <button
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-teal-700"
                onClick={() => setValidationModalOpen(true)}
                type="button"
              >
                <ClipboardCheck size={15} />
                Validate Dataset Now
              </button>
            </div>
          )}

          {/* Explorer Tabs (when report or features are available) */}
          {(report || dataset.validation_status !== 'not_validated') && (
            <div className="space-y-4">
              {/* Tab Navigation */}
              <div className="flex border-b border-slate-200 text-xs font-medium">
                <button
                  className={`border-b-2 px-4 py-2.5 transition-colors ${
                    activeTab === 'quality'
                      ? 'border-teal-700 font-semibold text-teal-900'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                  onClick={() => setActiveTab('quality')}
                  type="button"
                >
                  Quality Overview
                </button>
                <button
                  className={`border-b-2 px-4 py-2.5 transition-colors ${
                    activeTab === 'audit'
                      ? 'border-teal-700 font-semibold text-teal-900'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                  onClick={() => setActiveTab('audit')}
                  type="button"
                >
                  Compound Audit Records ({report?.diagnostics?.length || 0})
                </button>
                <button
                  className={`border-b-2 px-4 py-2.5 transition-colors ${
                    activeTab === 'duplicates'
                      ? 'border-teal-700 font-semibold text-teal-900'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                  onClick={() => setActiveTab('duplicates')}
                  type="button"
                >
                  Duplicate Structures ({report?.duplicate_structures?.length || 0})
                </button>
                <button
                  className={`border-b-2 px-4 py-2.5 transition-colors ${
                    activeTab === 'features'
                      ? 'border-teal-700 font-semibold text-teal-900'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                  onClick={() => setActiveTab('features')}
                  type="button"
                >
                  Feature Engineering & Export
                </button>
              </div>

              {/* Tab Panes */}
              {activeTab === 'quality' && <QualityOverview report={report} />}

              {activeTab === 'audit' && (
                <DiagnosticsTable diagnostics={report?.diagnostics || []} />
              )}

              {activeTab === 'duplicates' && (
                <DuplicateStructuresTable
                  duplicateStructures={report?.duplicate_structures || []}
                />
              )}

              {activeTab === 'features' && (
                <FeatureGenerationPanel
                  datasetId={dataset.dataset_id}
                  endpoint={dataset.endpoint || report?.endpoint}
                  units={dataset.units || report?.units}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Validation Modal */}
      <DatasetValidationModal
        dataset={dataset}
        isOpen={validationModalOpen}
        onClose={() => setValidationModalOpen(false)}
        onValidationSuccess={handleValidationSuccess}
      />
    </PageContainer>
  )
}
