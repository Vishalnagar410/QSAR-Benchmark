import { CheckCircle, AlertTriangle, XCircle, Copy, Layers, Database } from 'lucide-react'

export default function QualityOverview({ report }) {
  if (!report) return null

  const {
    source_row_count = 0,
    accepted_record_count = 0,
    rejected_record_count = 0,
    invalid_smiles_count = 0,
    missing_value_record_count = 0,
    duplicate_structure_group_count = 0,
    endpoint,
    units,
    validation_status,
  } = report

  const acceptanceRate =
    source_row_count > 0
      ? ((accepted_record_count / source_row_count) * 100).toFixed(1)
      : '0.0'

  return (
    <div className="space-y-4">
      {/* Target & Units Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
            <Database aria-hidden="true" size={18} />
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Endpoint Definition
            </span>
            <p className="font-mono text-sm font-semibold text-slate-900">
              {endpoint || 'Not restricted'} {units ? `(${units})` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Validation Status:</span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
              validation_status === 'validated'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-rose-200 bg-rose-50 text-rose-800'
            }`}
          >
            {validation_status === 'validated' ? (
              <CheckCircle aria-hidden="true" size={13} />
            ) : (
              <XCircle aria-hidden="true" size={13} />
            )}
            <span className="capitalize">{validation_status}</span>
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Source Rows */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Total Rows</span>
            <Layers aria-hidden="true" className="text-slate-400" size={16} />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-900">{source_row_count}</p>
          <p className="mt-1 text-[11px] text-slate-500">Raw rows from uploaded CSV</p>
        </div>

        {/* Accepted Records */}
        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/20 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-medium text-emerald-800">
            <span>Accepted Compounds</span>
            <CheckCircle aria-hidden="true" className="text-emerald-600" size={16} />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-emerald-950">{accepted_record_count}</p>
          <p className="mt-1 text-[11px] text-emerald-800/80">{acceptanceRate}% usable for ML modeling</p>
        </div>

        {/* Excluded Records */}
        <div className="rounded-xl border border-rose-200/80 bg-rose-50/20 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-medium text-rose-800">
            <span>Excluded Rows</span>
            <XCircle aria-hidden="true" className="text-rose-600" size={16} />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-rose-950">{rejected_record_count}</p>
          <p className="mt-1 text-[11px] text-rose-800/80">Filtered out due to quality rules</p>
        </div>

        {/* Duplicate Structure Groups */}
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/20 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-medium text-amber-800">
            <span>Duplicate Groups</span>
            <Copy aria-hidden="true" className="text-amber-600" size={16} />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-amber-950">
            {duplicate_structure_group_count}
          </p>
          <p className="mt-1 text-[11px] text-amber-800/80">Identical canonical SMILES groups</p>
        </div>
      </div>

      {/* Quality Issues Breakdown */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-md bg-rose-50 text-rose-700">
              <AlertTriangle aria-hidden="true" size={15} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800">Invalid SMILES Structures</p>
              <p className="text-[11px] text-slate-500">Unparseable by RDKit chemical parser</p>
            </div>
          </div>
          <span className="font-mono text-base font-bold text-slate-900">{invalid_smiles_count}</span>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-md bg-amber-50 text-amber-700">
              <AlertTriangle aria-hidden="true" size={15} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800">Missing Required Values</p>
              <p className="text-[11px] text-slate-500">Empty SMILES, missing activity or endpoint</p>
            </div>
          </div>
          <span className="font-mono text-base font-bold text-slate-900">{missing_value_record_count}</span>
        </div>
      </div>
    </div>
  )
}
