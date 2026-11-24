import { Component } from 'react'
import { AlertTriangle } from 'lucide-react'

export default class AppErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('Application rendering error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
          <section
            aria-labelledby="application-error-title"
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"
          >
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-50 text-amber-700">
              <AlertTriangle aria-hidden="true" size={22} />
            </span>
            <h1
              className="mt-5 text-xl font-semibold text-slate-900"
              id="application-error-title"
            >
              The application encountered an error
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              The page could not be displayed. Reload it to try again.
            </p>
            <button
              className="mt-6 inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
              onClick={() => window.location.reload()}
              type="button"
            >
              Reload application
            </button>
          </section>
        </main>
      )
    }

    return this.props.children
  }
}
