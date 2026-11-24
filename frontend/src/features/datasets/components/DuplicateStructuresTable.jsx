import { AlertCircle, Copy } from 'lucide-react'

export default function DuplicateStructuresTable({ duplicateStructures = [] }) {
  if (!duplicateStructures.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-xs text-slate-500">
        No duplicate molecular structures were detected in this dataset.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-xs text-amber-900">
        <AlertCircle aria-hidden="true" className="shrink-0 text-amber-600" size={16} />
        <span>
          <strong>Structure Duplication Warning:</strong> When multiple rows share identical canonical SMILES,
          QSAR-Benchmark retains only the designated record to prevent data leakage and variance distortion.
        </span>
      </div>

      <div
        aria-label="Duplicate molecular structure groups"
        className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs"
        role="region"
        tabIndex={0}
      >
        <table className="w-full min-w-[650px] border-collapse text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
            <tr>
              <th className="px-3 py-2.5" scope="col">
                Canonical SMILES
              </th>
              <th className="px-3 py-2.5" scope="col" style={{ width: '180px' }}>
                Compound IDs
              </th>
              <th className="px-3 py-2.5" scope="col" style={{ width: '140px' }}>
                Source Rows
              </th>
              <th className="px-3 py-2.5" scope="col" style={{ width: '130px' }}>
                Retained Row
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {duplicateStructures.map((group, index) => (
              <tr className="transition-colors hover:bg-slate-50/70" key={index}>
                <td className="px-3 py-2.5 font-mono text-[11px] text-slate-900 break-all select-all">
                  {group.canonical_smiles}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {group.compound_ids?.map((id, idIdx) => (
                      <span
                        className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-800"
                        key={idIdx}
                      >
                        {id}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2.5 font-mono text-slate-600">
                  {group.source_rows?.join(', ')}
                </td>
                <td className="px-3 py-2.5">
                  {group.included_source_rows?.length ? (
                    <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-emerald-800 border border-emerald-200">
                      Row {group.included_source_rows.join(', ')}
                    </span>
                  ) : (
                    <span className="text-[11px] text-rose-600 italic">None retained</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
