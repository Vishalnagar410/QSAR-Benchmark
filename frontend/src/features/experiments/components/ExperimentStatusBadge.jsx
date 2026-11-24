import { Activity, AlertCircle, CheckCircle2, Clock, Loader2 } from 'lucide-react'

export default function ExperimentStatusBadge({ status }) {
  const config = {
    created: {
      label: 'Ready to Run',
      tone: 'border-slate-200 bg-slate-100 text-slate-700',
      icon: Clock,
      spin: false,
    },
    queued: {
      label: 'Queued in Worker',
      tone: 'border-sky-200 bg-sky-50 text-sky-800',
      icon: Clock,
      spin: false,
    },
    running: {
      label: 'Executing Models',
      tone: 'border-amber-200 bg-amber-50 text-amber-900',
      icon: Loader2,
      spin: true,
    },
    completed: {
      label: 'Completed',
      tone: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      icon: CheckCircle2,
      spin: false,
    },
    failed: {
      label: 'Execution Failed',
      tone: 'border-rose-200 bg-rose-50 text-rose-800',
      icon: AlertCircle,
      spin: false,
    },
  }[status] || {
    label: status || 'Unknown',
    tone: 'border-slate-200 bg-slate-100 text-slate-700',
    icon: Activity,
    spin: false,
  }

  const Icon = config.icon

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${config.tone}`}
    >
      <Icon
        aria-hidden="true"
        className={`size-3.5 ${config.spin ? 'animate-spin' : ''}`}
      />
      <span>{config.label}</span>
    </span>
  )
}
