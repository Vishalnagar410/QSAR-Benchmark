import { useState } from 'react'
import { AlertCircle, CheckCircle2, ClipboardCheck, Loader2, X } from 'lucide-react'
import { validateDataset } from '../api/datasetsApi.js'

export default function DatasetValidationModal({
  isOpen,
  dataset,
  onClose,
  onValidationSuccess,
}) {
  const [endpoint, setEndpoint] = useState(dataset?.endpoint || '')
  const [units, setUnits] = useState(dataset?.units || '')
  const [assayId, setAssayId] = useState('')
  const [compoundIdCol, setCompoundIdCol] = useState('compound_id')
  const [smilesCol, setSmilesCol] = useState('smiles')
  const [activityCol, setActivityCol] = useState('activity')
  const [endpointCol, setEndpointCol] = useState('endpoint')
  const [unitsCol, setUnitsCol] = useState('units')
  const [assayIdCol, setAssayIdCol] = useState('assay_id')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  if (!isOpen || !dataset) return null

  async function handleValidate() {
    setLoading(true)
    setError(null)

    try {
      const payload = {
        endpoint: endpoint.trim() || null,
        units: units.trim() || null,
        assay_id: assayId.trim() || null,
        columns: {
          compound_id: compoundIdCol.trim() || 'compound_id',
          smiles: smilesCol.trim() || 'smiles',
          activity: activityCol.trim() || 'activity',
          endpoint: endpointCol.trim() || 'endpoint',
          units: unitsCol.trim() || 'units',
          assay_id: assayIdCol.trim() || 'assay_id',
        },
      }

      const report = await validateDataset(dataset.dataset_id, payload)
      onValidationSuccess?.(report)
      onClose()
    } catch (err) {
      setError(err.message || 'Validation failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      aria-labelledby="validation-modal-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity"
        onClick={loading ? undefined : onClose}
      />

      {/* Modal card */}
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
              <ClipboardCheck aria-hidden="true" size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900" id="validation-modal-title">
                Validate Chemical Dataset
              </h2>
              <p className="text-xs text-slate-500">
                Configure endpoint selection and column mappings for RDKit parsing
              </p>
            </div>
          </div>
          <button
            aria-label="Close modal"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-teal-700"
            disabled={loading}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[75vh] overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <AlertCircle className="mt-0.5 shrink-0 text-rose-600" size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* Target Selection */}
          <div className="rounded-lg border border-slate-200 p-3.5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Target Activity & Endpoint Filter
            </h3>
            <p className="text-[11px] text-slate-500">
              Optionally filter rows matching a specific endpoint or units (e.g. Ki, IC50 in nM).
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-slate-700">
                  Endpoint Name
                </label>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none"
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder="e.g. Ki, IC50"
                  type="text"
                  value={endpoint}
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700">
                  Target Units
                </label>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none"
                  onChange={(e) => setUnits(e.target.value)}
                  placeholder="e.g. nM, µM"
                  type="text"
                  value={units}
                />
              </div>
            </div>
          </div>

          {/* Column Mappings */}
          <div className="rounded-lg border border-slate-200 p-3.5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              CSV Header Column Mappings
            </h3>
            <p className="text-[11px] text-slate-500">
              Specify the column names in your uploaded CSV file corresponding to each field.
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-slate-700">
                  Compound ID Column *
                </label>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 font-mono text-xs text-slate-900 focus:border-teal-700 focus:outline-none"
                  onChange={(e) => setCompoundIdCol(e.target.value)}
                  type="text"
                  value={compoundIdCol}
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700">
                  SMILES Column *
                </label>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 font-mono text-xs text-slate-900 focus:border-teal-700 focus:outline-none"
                  onChange={(e) => setSmilesCol(e.target.value)}
                  type="text"
                  value={smilesCol}
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700">
                  Activity / Value Column *
                </label>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 font-mono text-xs text-slate-900 focus:border-teal-700 focus:outline-none"
                  onChange={(e) => setActivityCol(e.target.value)}
                  type="text"
                  value={activityCol}
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700">
                  Endpoint Column
                </label>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 font-mono text-xs text-slate-900 focus:border-teal-700 focus:outline-none"
                  onChange={(e) => setEndpointCol(e.target.value)}
                  type="text"
                  value={endpointCol}
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700">
                  Units Column
                </label>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 font-mono text-xs text-slate-900 focus:border-teal-700 focus:outline-none"
                  onChange={(e) => setUnitsCol(e.target.value)}
                  type="text"
                  value={unitsCol}
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700">
                  Assay ID Column
                </label>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 font-mono text-xs text-slate-900 focus:border-teal-700 focus:outline-none"
                  onChange={(e) => setAssayIdCol(e.target.value)}
                  type="text"
                  value={assayIdCol}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50/70 px-6 py-3.5">
          <button
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-slate-400"
            disabled={loading}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-teal-700 disabled:opacity-50"
            disabled={loading}
            onClick={handleValidate}
            type="button"
          >
            {loading ? (
              <>
                <Loader2 aria-hidden="true" className="animate-spin" size={14} />
                Executing RDKit Validation...
              </>
            ) : (
              'Run Validation'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
