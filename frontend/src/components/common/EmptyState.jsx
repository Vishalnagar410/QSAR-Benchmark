import { FlaskConical } from 'lucide-react'

export default function EmptyState({
  title,
  description,
  icon: Icon = FlaskConical,
  children,
}) {
  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-teal-50 text-teal-800">
        <Icon aria-hidden="true" size={22} strokeWidth={1.8} />
      </span>
      <h2 className="mt-4 text-base font-semibold text-slate-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
        {description}
      </p>
      {children && <div className="mt-5">{children}</div>}
    </section>
  )
}
