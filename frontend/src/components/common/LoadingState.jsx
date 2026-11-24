import { LoaderCircle } from 'lucide-react'

export default function LoadingState({
  label = 'Loading',
  centered = false,
  className = '',
}) {
  return (
    <div
      aria-live="polite"
      className={`flex items-center gap-3 text-sm text-slate-600 ${
        centered ? 'min-h-32 justify-center py-8' : ''
      } ${className}`}
      role="status"
    >
      <LoaderCircle
        aria-hidden="true"
        className="animate-spin text-teal-700"
        size={18}
      />
      <span className="font-medium text-slate-700">{label}</span>
    </div>
  )
}
