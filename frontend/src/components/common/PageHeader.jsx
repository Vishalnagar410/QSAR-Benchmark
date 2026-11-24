export default function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <span className="inline-flex items-center rounded-md bg-accent-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-800">
            {eyebrow}
          </span>
        )}
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-brand-900 sm:text-[1.75rem]">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
    </header>
  )
}
