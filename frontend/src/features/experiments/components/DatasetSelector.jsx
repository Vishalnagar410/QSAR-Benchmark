import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Database, FileSpreadsheet, Info } from 'lucide-react'
import { fetchDatasets } from '../../datasets/api/datasetsApi.js'
import LoadingState from '../../../components/common/LoadingState.jsx'

export default function DatasetSelector({ selectedDatasetId, onSelectDataset }) {
  const [datasets, setDatasets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    fetchDatasets()
      .then((data) => {
        if (active) setDatasets(data)
      })
      .catch((err) => {
        if (active) setError(err.message || 'Failed to load datasets.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return <LoadingState centered label="Loading registered datasets..." />
  }

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
        <p className="font-semibold">Could not load datasets:</p>
        <p className="mt-1">{error}</p>
      </div>
    )
  }

  if (!datasets.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
        <Database className="mx-auto size-10 text-slate-400" />
        <h3 className="mt-2 text-sm font-semibold text-slate-800">No Datasets Available</h3>
        <p className="mt-1 text-xs text-slate-500">
          You must register and validate at least one chemical dataset before running benchmark experiments.
        </p>
        <Link
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-800"
          to="/datasets"
        >
          Go to Dataset Management
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
          Select Validated Dataset *
        </label>
        <span className="text-[11px] text-slate-500">
          {datasets.filter((d) => d.validation_status === 'validated').length} validated available
        </span>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {datasets.map((dataset) => {
          const isValidated = dataset.validation_status === 'validated'
          const isSelected = selectedDatasetId === dataset.dataset_id

          return (
            <div
              className={`relative rounded-xl border p-4 transition-all ${
                isSelected
                  ? 'border-teal-600 bg-teal-50/40 ring-1 ring-teal-600 shadow-2xs'
                  : isValidated
                    ? 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-2xs cursor-pointer'
                    : 'border-slate-200 bg-slate-50/60 opacity-75'
              }`}
              key={dataset.dataset_id}
              onClick={() => {
                if (isValidated) {
                  onSelectDataset(dataset)
                }
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileSpreadsheet
                    className={`shrink-0 ${isValidated ? 'text-teal-700' : 'text-slate-400'}`}
                    size={18}
                  />
                  <p className="truncate font-semibold text-xs text-slate-900">
                    {dataset.original_filename}
                  </p>
                </div>
                {isValidated ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800">
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    Validated
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400 italic">
                    Not validated
                  </span>
                )}
              </div>

              <div className="mt-2.5 grid grid-cols-2 gap-1 text-[11px] text-slate-600">
                <div>
                  <span className="text-slate-400">Total Rows: </span>
                  <span className="font-mono font-medium">{dataset.record_count}</span>
                </div>
                <div>
                  <span className="text-slate-400">Accepted: </span>
                  <span className="font-mono font-medium text-emerald-700">
                    {dataset.accepted_record_count ?? '—'}
                  </span>
                </div>
                <div className="col-span-2 truncate">
                  <span className="text-slate-400">Endpoint: </span>
                  <span className="font-mono font-semibold text-slate-800">
                    {dataset.endpoint ? `${dataset.endpoint} (${dataset.units || ''})` : 'Unspecified'}
                  </span>
                </div>
              </div>

              {!isValidated && (
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-amber-800">
                  <span>Requires RDKit validation first</span>
                  <Link
                    className="font-semibold underline hover:text-amber-950"
                    to={`/datasets/${dataset.dataset_id}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Validate Now
                  </Link>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
