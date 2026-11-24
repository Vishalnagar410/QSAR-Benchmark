import { useEffect, useRef, useState } from 'react'
import { Outlet } from 'react-router-dom'
import AppHeader from './AppHeader.jsx'
import AppSidebar from './AppSidebar.jsx'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const sidebarRef = useRef(null)
  const menuButtonRef = useRef(null)

  function closeSidebar() {
    setSidebarOpen(false)
  }

  useEffect(() => {
    if (!sidebarOpen) return undefined

    sidebarRef.current
      ?.querySelector('button[aria-label="Close navigation"]')
      ?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        closeSidebar()
        return
      }

      if (event.key === 'Tab') {
        const focusable = Array.from(
          sidebarRef.current?.querySelectorAll('a[href], button:not([disabled])') ?? [],
        ).filter((element) => element.getClientRects().length > 0)
        const first = focusable[0]
        const last = focusable[focusable.length - 1]

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
      document.removeEventListener('keydown', handleKeyDown)
      menuButtonRef.current?.focus()
    }
  }, [sidebarOpen])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {sidebarOpen && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-slate-950/45 backdrop-blur-[1px] lg:hidden"
          onClick={closeSidebar}
          type="button"
        />
      )}
      <AppSidebar
        collapsed={sidebarCollapsed}
        onNavigate={closeSidebar}
        onToggleCollapse={() => setSidebarCollapsed((collapsed) => !collapsed)}
        open={sidebarOpen}
        sidebarRef={sidebarRef}
      />
      <div
        className={`min-h-screen transition-[padding] duration-200 ${
          sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-[264px]'
        }`}
      >
        <AppHeader
          menuButtonRef={menuButtonRef}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <Outlet />
      </div>
    </div>
  )
}
