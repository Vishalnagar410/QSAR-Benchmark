import { useMemo, useState } from 'react'
import { CheckCircle2, ChevronLeft, ChevronRight, XCircle } from 'lucide-react'
import SearchInput from '../../../components/common/SearchInput.jsx'
import StatusBadge from '../../../components/common/StatusBadge.jsx'

const ROWS_PER_PAGE = 25

export default function DiagnosticsTable({ diagnostics = [] }) {
  const [filterStatus, setFilterStatus] = useState('all') // 'all' | 'included' | 'excluded'
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const filteredDiagnostics = useMemo(() => {
    return diagnostics.filter((row) => {
      // Status filter
      if (filterStatus === 'included' && !row.included) return false
      if (filterStatus === 'excluded' && row.included) return false

      // Search query filter (compound ID or SMILES)
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase()
        const idMatch = row.compound_id?.toLowerCase().includes(query)
        const smilesMatch = row.canonical_smiles?.toLowerCase().includes(query)
        const reasonMatch = row.exclusion_reasons?.some((r) => r.toLowerCase().includes(query))
        if (!idMatch && !smilesMatch && !reasonMatch) return false
      }

      return true
    })
  }, [diagnostics, filterStatus, searchQuery])

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredDiagnostics.length / ROWS_PER_PAGE))
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * ROWS_PER_PAGE
    return filteredDiagnostics.slice(startIndex, startIndex + ROWS_PER_PAGE)
  }, [filteredDiagnostics, currentPage])

  function handleFilterChange(newFilter) {
    setFilterStatus(newFilter)
    setCurrentPage(1)
  }

  function handleSearchChange(newQuery) {
    setSearchQuery(newQuery)
    setCurrentPage(1)
  }

  return (
    <div className="space-y-3">
      {/* Table controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Status pill filter */}
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-1 text-xs">
          <button
            className={`rounded-md px-3 py-1 font-medium transition-colors ${
              filterStatus === 'all'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => handleFilterChange('all')}
            type="button"
          >
            All ({diagnostics.length})
          </button>
          <button
            className={`rounded-md px-3 py-1 font-medium transition-colors ${
              filterStatus === 'included'
                ? 'bg-emerald-700 text-white'
                : 'text-slate-600 hover:text-emerald-700'
            }`}
            onClick={() => handleFilterChange('included')}
            type="button"
          >
            Included ({diagnostics.filter((d) => d.included).length})
          </button>
          <button
            className={`rounded-md px-3 py-1 font-medium transition-colors ${
              filterStatus === 'excluded'
                ? 'bg-rose-700 text-white'
                : 'text-slate-600 hover:text-rose-700'
            }`}
            onClick={() => handleFilterChange('excluded')}
            type="button"
          >
            Excluded ({diagnostics.filter((d) => !d.included).length})
          </button>
        </div>

        {/* Search */}
        <div className="w-full sm:w-72">
          <SearchInput
            onChange={handleSearchChange}
            placeholder="Search compound ID or SMILES..."
            value={searchQuery}
          />
        </div>
      </div>

      {/* Table */}
      <div
        aria-label="Dataset compound audit diagnostics"
        className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs"
        role="region"
        tabIndex={0}
      >
        <table className="w-full min-w-[700px] border-collapse text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
            <tr>
              <th className="px-3 py-2.5 text-center" scope="col" style={{ width: '80px' }}>
                Row
              </th>
              <th className="px-3 py-2.5" scope="col" style={{ width: '100px' }}>
                Status
              </th>
              <th className="px-3 py-2.5" scope="col" style={{ width: '160px' }}>
                Compound ID
              </th>
              <th className="px-3 py-2.5" scope="col">
                Canonical SMILES
              </th>
              <th className="px-3 py-2.5" scope="col" style={{ width: '220px' }}>
                Audit Reasons
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {paginatedRows.length ? (
              paginatedRows.map((row) => (
                <tr className="transition-colors hover:bg-slate-50/70" key={row.source_row}>
                  <td className="px-3 py-2 text-center font-mono text-slate-500">
                    {row.source_row}
                  </td>
                  <td className="px-3 py-2">
                    {row.included ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                        <CheckCircle2 aria-hidden="true" size={12} />
                        Included
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-800">
                        <XCircle aria-hidden="true" size={12} />
                        Excluded
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono font-medium text-slate-900">
                    {row.compound_id || <span className="text-slate-400">None</span>}
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-slate-800 break-all select-all">
                    {row.canonical_smiles || (
                      <span className="italic text-slate-400">Invalid / Unparseable</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {row.exclusion_reasons && row.exclusion_reasons.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {row.exclusion_reasons.map((reason, index) => (
                          <span
                            className="rounded bg-rose-100/70 px-1.5 py-0.5 text-[10px] font-medium text-rose-800"
                            key={index}
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400">Valid</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-8 text-center text-xs text-slate-500" colSpan={5}>
                  No records match the current filter or search criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 text-xs text-slate-600">
          <span>
            Showing {(currentPage - 1) * ROWS_PER_PAGE + 1} to{' '}
            {Math.min(currentPage * ROWS_PER_PAGE, filteredDiagnostics.length)} of{' '}
            {filteredDiagnostics.length} records
          </span>
          <div className="flex items-center gap-1">
            <button
              className="inline-flex size-7 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              type="button"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-2 font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="inline-flex size-7 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              type="button"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
