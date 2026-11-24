import { Search, X } from 'lucide-react'

export default function SearchInput({
  value,
  onChange,
  placeholder = 'Search',
  label = 'Search',
  disabled = false,
  className = '',
}) {
  return (
    <label className={`relative block min-w-0 ${className}`}>
      <span className="sr-only">{label}</span>
      <Search
        aria-hidden="true"
        className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${
          disabled ? 'text-slate-300' : 'text-slate-400'
        }`}
        size={16}
      />
      <input
        className="min-h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-10 text-sm text-slate-900 placeholder:text-slate-400 hover:border-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="search"
        value={value}
      />
      {value && !disabled && (
        <button
          aria-label="Clear search"
          className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-700"
          onClick={() => onChange('')}
          type="button"
        >
          <X aria-hidden="true" size={14} />
        </button>
      )}
    </label>
  )
}
