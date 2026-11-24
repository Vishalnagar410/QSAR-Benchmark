import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  ClipboardCheck,
  Database,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react'
import EmptyState from '../../../components/common/EmptyState.jsx'
import ErrorState from '../../../components/common/ErrorState.jsx'
import LoadingState from '../../../components/common/LoadingState.jsx'
import PageContainer from '../../../components/common/PageContainer.jsx'
import SearchInput from '../../../components/common/SearchInput.jsx'
import StatusBadge from '../../../components/common/StatusBadge.jsx'
import { fetchDatasets } from '../api/datasetsApi.js'
import DatasetUploadModal from '../components/DatasetUploadModal.jsx'
import DatasetValidationModal from '../components/DatasetValidationModal.jsx'

export default function DatasetsPage() {
  const [datasets, setDatasets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [validatingDataset, setValidatingDataset] = useState(null)

  const navigate = useNavigate()

  async function loadDatasets(showLoading = true) {
    if (showLoading) setLoading(true)
    setError(null)
    try {
      const data = await fetchDatasets()
      setDatasets(data)
    } catch (err) {
      setError(err.message || 'Failed to load datasets.')
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  useEffect(() => {
    loadDatasets()
  }, [])

  const filteredDatasets = useMemo(() => {
    return datasets.filter((dataset) => {
      // Status filter
      if (statusFilter !== 'all' && dataset.validation_status !== statusFilter) {
        return false
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase()
        const nameMatch = dataset.original_filename?.toLowerCase().includes(query)
        const idMatch = dataset.dataset_id?.toLowerCase().includes(query)
        const endpointMatch = dataset.endpoint?.toLowerCase().includes(query)
        if (!nameMatch && !idMatch && !endpointMatch) return false
      }

      return true
    })
  }, [datasets, statusFilter, searchQuery])

  function handleUploadSuccess(newDataset) {
    loadDatasets(false)
    if (newDataset?.dataset_id) {
      navigate(`/datasets/${newDataset.dataset_id}`)
    }
  }

  function handleValidationSuccess(report) {
    loadDatasets(false)
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
            aria-label="Refresh datasets list"
            className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-700"
            disabled={loading}
            onClick={() => loadDatasets(true)}
            title="Refresh list"
            type="button"
          >
            <RefreshCw
              aria-hidden="true"
              className={loading ? 'animate-spin' : ''}
              size={15}
            />
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
            onClick={() => setUploadModalOpen(true)}
            type="button"
          >
            <Plus aria-hidden="true" size={16} />
            Register Dataset
          </button>
        </div>
      }
      description="Manage uploaded chemical structures, inspect endpoints, and perform RDKit validation."
      eyebrow="Data Management"
      title="Chemical Datasets"
    >
      {loading && !datasets.length ? (
        <LoadingState centered label="Loading registered datasets..." />
      ) : error ? (
        <ErrorState
          message={error}
          onRetry={() => loadDatasets(true)}
          title="Could not retrieve datasets"
        />
      ) : !datasets.length ? (
        <EmptyState
          description="Upload a CSV file containing chemical structures (SMILES) and bioactivity values to start benchmarking."
          icon={Database}
          title="No datasets registered yet"
        >
          <button
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-teal-700"
            onClick={() => setUploadModalOpen(true)}
            type="button"
          >
            <Plus aria-hidden="true" size={16} />
            Register Your First Dataset
          </button>
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between shadow-2xs">
            <div className="w-full sm:w-80">
              <SearchInput
                onChange={setSearchQuery}
                placeholder="Search by filename, ID, endpoint..."
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
                  statusFilter === 'validated'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
                onClick={() => setStatusFilter('validated')}
                type="button"
              >
                Validated
              </button>
              <button
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                  statusFilter === 'not_validated'
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                onClick={() => setStatusFilter('not_validated')}
                type="button"
              >
                Not Validated
              </button>
              <button
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                  statusFilter === 'invalid'
                    ? 'bg-rose-700 text-white'
                    : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                }`}
                onClick={() => setStatusFilter('invalid')}
                type="button"
              >
                Invalid
              </button>
            </div>
          </div>

          {/* Dataset Table */}
          <div
            aria-label="Registered chemical datasets"
            className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs focus-visible:outline-2 focus-visible:outline-teal-700"
            role="region"
            tabIndex={0}
          >
            <table className="w-full min-w-[760px] border-collapse text-left text-xs sm:text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-4 py-3" scope="col">
                    Dataset Name
                  </th>
                  <th className="px-4 py-3" scope="col" style={{ width: '130px' }}>
                    Dataset ID
                  </th>
                  <th className="px-4 py-3 text-right" scope="col" style={{ width: '90px' }}>
                    Rows
                  </th>
                  <th className="px-4 py-3" scope="col" style={{ width: '130px' }}>
                    Endpoint
                  </th>
                  <th className="px-4 py-3" scope="col" style={{ width: '140px' }}>
                    Validation Status
                  </th>
                  <th className="px-4 py-3" scope="col" style={{ width: '170px' }}>
                    Uploaded At
                  </th>
                  <th className="px-4 py-3 text-right" scope="col" style={{ width: '120px' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredDatasets.length ? (
                  filteredDatasets.map((dataset) => (
                    <tr
                      className="transition-colors hover:bg-slate-50/70"
                      key={dataset.dataset_id}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet aria-hidden="true" className="shrink-0 text-teal-700" size={17} />
                          <Link
                            className="font-medium text-slate-900 hover:text-teal-800 hover:underline"
                            to={`/datasets/${dataset.dataset_id}`}
                          >
                            {dataset.original_filename}
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">
                        <span title={dataset.dataset_id}>
                          {dataset.dataset_id.slice(0, 8)}...
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-slate-800">
                        {dataset.record_count?.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">
                        {dataset.endpoint ? (
                          <span>
                            {dataset.endpoint} {dataset.units ? `(${dataset.units})` : ''}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Not set</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
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
                          <span className="capitalize">
                            {dataset.validation_status?.replace('_', ' ') || 'Unknown'}
                          </span>
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {formatDateTime(dataset.uploaded_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {dataset.validation_status === 'not_validated' && (
                            <button
                              aria-label={`Validate ${dataset.original_filename}`}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-teal-800"
                              onClick={() => setValidatingDataset(dataset)}
                              title="Validate Dataset"
                              type="button"
                            >
                              <ClipboardCheck size={13} />
                              Validate
                            </button>
                          )}
                          <Link
                            aria-label={`View details of ${dataset.original_filename}`}
                            className="inline-flex size-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            title="Explore Dataset"
                            to={`/datasets/${dataset.dataset_id}`}
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
                      No datasets match the search or status filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <DatasetUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />

      <DatasetValidationModal
        dataset={validatingDataset}
        isOpen={Boolean(validatingDataset)}
        onClose={() => setValidatingDataset(null)}
        onValidationSuccess={handleValidationSuccess}
      />
    </PageContainer>
  )
}
