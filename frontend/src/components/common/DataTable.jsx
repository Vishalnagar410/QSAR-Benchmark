export default function DataTable({
  caption,
  columns,
  rows,
  rowKey = 'id',
  emptyMessage = 'No records to display.',
}) {
  return (
    <div
      aria-label={caption || 'Data table'}
      className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
      role="region"
      tabIndex={0}
    >
      <table className="w-full min-w-[580px] border-collapse text-left text-xs sm:text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-semibold uppercase tracking-wider text-slate-600 sm:text-xs">
          <tr>
            {columns.map((column) => (
              <th
                className={`whitespace-nowrap px-4 py-3 font-semibold ${
                  column.align === 'right' ? 'text-right' : 'text-left'
                }`}
                key={column.key}
                scope="col"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700">
          {rows.length ? (
            rows.map((row, index) => (
              <tr
                className="transition-colors hover:bg-slate-50/70"
                key={row[rowKey] ?? index}
              >
                {columns.map((column) => (
                  <td
                    className={`px-4 py-2.5 sm:py-3 ${
                      column.align === 'right' ? 'text-right tabular-nums' : ''
                    } ${column.mono ? 'font-mono text-xs' : ''}`}
                    key={column.key}
                  >
                    {column.render
                      ? column.render(row[column.key], row)
                      : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td
                className="px-4 py-12 text-center text-sm text-slate-500"
                colSpan={columns.length || 1}
              >
                <p className="font-medium text-slate-600">{emptyMessage}</p>
                <p className="mt-1 text-xs text-slate-400">
                  Data will populate when connected records or query results are available.
                </p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
