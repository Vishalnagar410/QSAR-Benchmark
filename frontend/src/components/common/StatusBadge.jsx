const statusStyles = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  error: 'border-rose-200 bg-rose-50 text-rose-800',
  info: 'border-sky-200 bg-sky-50 text-sky-800',
  neutral: 'border-slate-200 bg-slate-100 text-slate-700',
}

export default function StatusBadge({ children, tone = 'neutral', dot = false }) {
  const dotColor = {
    success: 'bg-emerald-600',
    warning: 'bg-amber-600',
    error: 'bg-rose-600',
    info: 'bg-sky-600',
    neutral: 'bg-slate-500',
  }[tone] || 'bg-slate-500'

  return (
    <span
      className={`inline-flex min-h-6 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-tight ${
        statusStyles[tone] ?? statusStyles.neutral
      }`}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={`mr-1.5 size-1.5 shrink-0 rounded-full ${dotColor}`}
        />
      )}
      {children}
    </span>
  )
}
