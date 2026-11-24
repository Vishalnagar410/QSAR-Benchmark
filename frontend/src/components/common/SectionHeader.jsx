export default function SectionHeader({ title, description, action, id }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-slate-900" id={id}>
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm leading-5 text-slate-600">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
