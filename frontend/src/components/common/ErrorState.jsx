import { AlertCircle } from 'lucide-react'

export default function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}) {
  return (
    <section
      aria-labelledby="error-state-title"
      className="rounded-xl border border-rose-200 bg-rose-50 p-5"
      role="alert"
    >
      <div className="flex items-start gap-3">
        <AlertCircle
          aria-hidden="true"
          className="mt-0.5 shrink-0 text-rose-700"
          size={19}
        />
        <div>
          <h2
            className="text-sm font-semibold text-rose-950"
            id="error-state-title"
          >
            {title}
          </h2>
          <p className="mt-1 text-sm leading-6 text-rose-800">{message}</p>
          {onRetry && (
            <button
              className="mt-3.5 inline-flex min-h-9 items-center justify-center rounded-lg border border-rose-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-rose-900 shadow-2xs transition-colors hover:bg-rose-100/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
              onClick={onRetry}
              type="button"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
