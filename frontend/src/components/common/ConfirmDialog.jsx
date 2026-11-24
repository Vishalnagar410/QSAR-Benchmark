import { useEffect, useRef } from 'react'
import { AlertTriangle, Info, X } from 'lucide-react'

export default function ConfirmDialog({
  isOpen,
  title = 'Confirm Action',
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary', // 'primary' | 'danger' | 'warning'
  isLoading = false,
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null)
  const confirmButtonRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return

    // Focus confirm button when dialog opens
    const timer = setTimeout(() => {
      confirmButtonRef.current?.focus()
    }, 50)

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCancel?.()
        return
      }

      if (event.key === 'Tab' && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        const first = focusableElements[0]
        const last = focusableElements[focusableElements.length - 1]

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onCancel])

  if (!isOpen) return null

  const toneConfig = {
    danger: {
      icon: AlertTriangle,
      iconColor: 'text-rose-600 bg-rose-50 border-rose-200',
      confirmButton:
        'bg-rose-600 text-white hover:bg-rose-700 focus-visible:outline-rose-600',
    },
    warning: {
      icon: AlertTriangle,
      iconColor: 'text-amber-600 bg-amber-50 border-amber-200',
      confirmButton:
        'bg-amber-600 text-white hover:bg-amber-700 focus-visible:outline-amber-600',
    },
    primary: {
      icon: Info,
      iconColor: 'text-teal-700 bg-teal-50 border-teal-200',
      confirmButton:
        'bg-teal-700 text-white hover:bg-teal-800 focus-visible:outline-teal-700',
    },
  }[tone] || {
    icon: Info,
    iconColor: 'text-teal-700 bg-teal-50 border-teal-200',
    confirmButton:
      'bg-teal-700 text-white hover:bg-teal-800 focus-visible:outline-teal-700',
  }

  const Icon = toneConfig.icon

  return (
    <div
      aria-describedby={description ? 'confirm-dialog-description' : undefined}
      aria-labelledby="confirm-dialog-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity"
        onClick={isLoading ? undefined : onCancel}
      />

      {/* Dialog card */}
      <div
        className="relative z-10 w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-xl transition-all"
        ref={dialogRef}
      >
        <div className="flex items-start gap-4">
          <div
            className={`flex size-10 shrink-0 items-center justify-center rounded-lg border ${toneConfig.iconColor}`}
          >
            <Icon aria-hidden="true" size={20} />
          </div>

          <div className="min-w-0 flex-1">
            <h3
              className="text-base font-semibold text-slate-900"
              id="confirm-dialog-title"
            >
              {title}
            </h3>
            {description && (
              <p
                className="mt-2 text-sm leading-5 text-slate-600"
                id="confirm-dialog-description"
              >
                {description}
              </p>
            )}
          </div>

          <button
            aria-label="Close dialog"
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-700"
            disabled={isLoading}
            onClick={onCancel}
            type="button"
          >
            <X aria-hidden="true" size={16} />
          </button>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 disabled:opacity-50"
            disabled={isLoading}
            onClick={onCancel}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className={`inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 ${toneConfig.confirmButton}`}
            disabled={isLoading}
            onClick={onConfirm}
            ref={confirmButtonRef}
            type="button"
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
