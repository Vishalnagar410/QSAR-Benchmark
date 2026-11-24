export default function StatCard({
  label,
  value,
  description,
  icon: Icon,
  emptyLabel = 'No data available yet',
}) {
  const hasValue = value !== undefined && value !== null

  return (
    <section
      aria-label={label}
      className="min-w-0 rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all hover:border-slate-300"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </h2>
        {Icon && (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
            <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
          </span>
        )}
      </div>
      {hasValue ? (
        <p className="mt-3.5 break-words font-mono text-2xl font-bold tracking-tight text-slate-900">
          {value}
        </p>
      ) : (
        <div className="mt-3.5 flex items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-block size-2 rounded-full bg-slate-300"
          />
          <p className="text-sm font-medium text-slate-400">{emptyLabel}</p>
        </div>
      )}
      {description && (
        <p className="mt-2 text-xs leading-relaxed text-slate-500">{description}</p>
      )}
    </section>
  )
}
