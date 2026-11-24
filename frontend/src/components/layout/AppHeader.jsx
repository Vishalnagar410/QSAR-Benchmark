import { Activity, CircleAlert, LoaderCircle, Menu } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import StatusBadge from '../common/StatusBadge.jsx'
import useApiHealth from '../../hooks/useApiHealth.js'
import { getPageTitle } from '../../routes/navigation.js'

export default function AppHeader({ onMenuClick, menuButtonRef }) {
  const { pathname } = useLocation()
  const title = getPageTitle(pathname)
  const health = useApiHealth()

  const healthPresentation = {
    checking: {
      label: 'Checking API',
      tone: 'neutral',
      icon: LoaderCircle,
    },
    connected: {
      label: 'API connected',
      tone: 'success',
      icon: Activity,
    },
    unavailable: {
      label: 'API unavailable',
      tone: 'warning',
      icon: CircleAlert,
    },
  }[health]
  const HealthIcon = healthPresentation.icon

  return (
    <header className="sticky top-0 z-20 flex min-h-[72px] items-center justify-between gap-3 border-b border-slate-200/90 bg-white/95 px-4 backdrop-blur sm:min-h-[76px] sm:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          aria-label="Open navigation"
          className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 lg:hidden"
          onClick={onMenuClick}
          ref={menuButtonRef}
          type="button"
        >
          <Menu aria-hidden="true" size={18} />
        </button>
        <div className="min-w-0">
          <nav aria-label="Breadcrumb" className="mb-1 flex items-center gap-2 text-xs">
            <Link
              className="text-slate-500 transition-colors hover:text-teal-800 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
              to="/"
            >
              Workspace
            </Link>
            <span aria-hidden="true" className="text-slate-300">
              /
            </span>
            <span aria-current="page" className="truncate font-medium text-slate-700">
              {title}
            </span>
          </nav>
          <p className="truncate text-sm font-semibold text-slate-950 sm:text-base">
            {title}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
        <StatusBadge tone={healthPresentation.tone}>
          <HealthIcon
            aria-hidden="true"
            className={`mr-1.5 shrink-0 ${
              health === 'checking' ? 'animate-spin' : ''
            }`}
            size={14}
          />
          <span className="hidden sm:inline">{healthPresentation.label}</span>
          <span className="sm:hidden">
            {health === 'connected'
              ? 'Connected'
              : health === 'checking'
                ? 'Checking'
                : 'Offline'}
          </span>
        </StatusBadge>

        <div
          aria-label="Local workstation profile placeholder"
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1 text-xs text-slate-600"
          title="Local workstation profile placeholder (single-user / offline)"
        >
          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-700">
            R
          </div>
          <span className="hidden font-medium text-slate-700 md:inline">
            Researcher
          </span>
          <span className="hidden rounded bg-slate-200/60 px-1.5 py-0.5 text-[10px] text-slate-500 xl:inline">
            Local
          </span>
        </div>
      </div>
    </header>
  )
}
