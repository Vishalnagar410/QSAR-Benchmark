import {
  BookOpenText,
  FlaskConical,
  ChevronsLeft,
  ChevronsRight,
  X,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { Atom, navigation } from '../../routes/navigation.js'

export default function AppSidebar({
  onNavigate,
  open,
  collapsed,
  onToggleCollapse,
  sidebarRef,
}) {
  return (
    <aside
      aria-label="Main navigation"
      aria-modal={open ? 'true' : undefined}
      className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-brand-950 text-slate-300 transition-[width,transform,visibility] duration-200 ${
        collapsed ? 'w-[264px] lg:w-20' : 'w-[264px]'
      } ${
        open
          ? 'visible translate-x-0'
          : 'invisible -translate-x-full lg:visible lg:translate-x-0'
      }`}
      ref={sidebarRef}
      role={open ? 'dialog' : undefined}
    >
      <div
        className={`flex h-[76px] shrink-0 items-center justify-between border-b border-white/10 ${
          collapsed ? 'px-5 lg:justify-center lg:px-0' : 'px-6'
        }`}
      >
        <NavLink
          aria-label="QSAR-Benchmark dashboard"
          className="flex min-w-0 items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-300"
          onClick={onNavigate}
          to="/"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-400/15 text-teal-300">
            <Atom aria-hidden="true" size={22} strokeWidth={1.8} />
          </span>
          <span
            className={`min-w-0 leading-tight ${
              collapsed ? 'lg:hidden' : ''
            }`}
          >
            <span className="block truncate text-[13px] font-semibold tracking-wide text-white">
              QSAR-Benchmark
            </span>
            <span className="mt-1 block text-[10px] font-medium tracking-wide text-slate-400">
              Scientific modelling platform
            </span>
          </span>
        </NavLink>
        <div className="flex shrink-0 items-center gap-1">
          <button
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            className="hidden size-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 lg:flex"
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            type="button"
          >
            {collapsed ? (
              <ChevronsRight aria-hidden="true" size={18} />
            ) : (
              <ChevronsLeft aria-hidden="true" size={18} />
            )}
          </button>
          <button
            aria-label="Close navigation"
            className="flex size-10 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 lg:hidden"
            onClick={onNavigate}
            type="button"
          >
            <X aria-hidden="true" size={19} />
          </button>
        </div>
      </div>

      <div className={`px-3 pt-7 ${collapsed ? 'lg:px-2' : 'lg:px-4'}`}>
        <p
          className={`px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 ${
            collapsed ? 'lg:sr-only' : ''
          }`}
        >
          Workspace navigation
        </p>
        <nav
          aria-label="Workspace"
          className={`mt-3 space-y-1 ${collapsed ? 'lg:mt-0' : ''}`}
        >
          {navigation.map(({ label, to, icon: Icon, end }) => (
            <NavLink
              aria-label={label}
              key={to}
              className={({ isActive }) =>
                `group relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 ${
                  isActive
                    ? 'bg-teal-500/15 font-semibold text-teal-200'
                    : 'text-slate-300 hover:bg-white/[0.07] hover:text-white'
                } ${collapsed ? 'lg:justify-center lg:px-0' : ''}`
              }
              end={end}
              onClick={onNavigate}
              to={to}
              title={collapsed ? label : undefined}
            >
              {({ isActive }) => (
                <>
                  {isActive && !collapsed && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-teal-400"
                    />
                  )}
                  <Icon
                    aria-hidden="true"
                    className={`shrink-0 transition-colors ${
                      isActive ? 'text-teal-300' : 'text-slate-400 group-hover:text-white'
                    }`}
                    size={18}
                    strokeWidth={1.8}
                  />
                  <span className={collapsed ? 'lg:hidden' : ''}>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      <div
        className={`mt-auto border-t border-white/10 ${
          collapsed ? 'p-3 lg:p-2' : 'p-5'
        }`}
      >
        <div
          className={`flex min-h-11 items-center gap-3 rounded-lg bg-white/[0.05] px-3 py-2 ${
            collapsed ? 'lg:justify-center lg:px-0' : ''
          }`}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-700/70 text-teal-200">
            <FlaskConical aria-hidden="true" size={16} />
          </span>
          <span className={`min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
            <span className="block text-xs font-medium text-slate-100">
              Local environment
            </span>
            <span className="mt-1 block text-[11px] leading-4 text-slate-300">
              Research stays on this machine
            </span>
          </span>
        </div>
      </div>
    </aside>
  )
}
