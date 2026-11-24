export default function FilterBar({ label = 'Filters', children, className = '' }) {
  return (
    <div
      aria-label={label}
      className={`flex min-w-0 flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:flex-wrap sm:items-center ${className}`}
      role="group"
    >
      {children}
    </div>
  )
}
