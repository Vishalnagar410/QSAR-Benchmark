import { HelpCircle, Shuffle, Split } from 'lucide-react'

export default function SplitConfiguration({
  splitStrategy,
  onChangeSplitStrategy,
  testFraction,
  onChangeTestFraction,
  randomSeed,
  onChangeRandomSeed,
}) {
  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">
          Train / Test Split Configuration
        </h3>
        <p className="text-xs text-slate-500">
          Partitioning is performed server-side by the scientific engine to guarantee leakage-free evaluation
        </p>
      </div>

      {/* Strategy selector radio cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Random Split */}
        <label
          className={`flex cursor-pointer flex-col rounded-xl border p-4 transition-all ${
            splitStrategy === 'random'
              ? 'border-teal-600 bg-teal-50/40 ring-1 ring-teal-600 shadow-2xs'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                checked={splitStrategy === 'random'}
                className="size-4 text-teal-700 focus:ring-teal-700"
                name="splitStrategy"
                onChange={() => onChangeSplitStrategy('random')}
                type="radio"
              />
              <span className="text-xs font-bold text-slate-900">
                Random Partition Split
              </span>
            </div>
            <Shuffle className="size-4 text-slate-400" />
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
            Uniformly samples compounds into train and test sets regardless of structural homology.
            Evaluates prediction accuracy when test compounds resemble training series.
          </p>
        </label>

        {/* Scaffold Split */}
        <label
          className={`flex cursor-pointer flex-col rounded-xl border p-4 transition-all ${
            splitStrategy === 'scaffold'
              ? 'border-teal-600 bg-teal-50/40 ring-1 ring-teal-600 shadow-2xs'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                checked={splitStrategy === 'scaffold'}
                className="size-4 text-teal-700 focus:ring-teal-700"
                name="splitStrategy"
                onChange={() => onChangeSplitStrategy('scaffold')}
                type="radio"
              />
              <span className="text-xs font-bold text-slate-900">
                Bemis–Murcko Scaffold Split
              </span>
            </div>
            <Split className="size-4 text-teal-700" />
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
            Computes 2D Murcko frameworks and places entire scaffold families into disjoint sets.
            Rigorously tests extrapolation to structurally distinct chemotypes and scaffold hops.
          </p>
        </label>
      </div>

      {/* Numeric inputs */}
      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100 text-xs">
        <div>
          <label className="block text-[11px] font-semibold text-slate-700">
            Test Set Fraction (0.01 – 0.99)
          </label>
          <div className="mt-1 flex items-center gap-2">
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 font-mono text-xs text-slate-900 focus:border-teal-700 focus:outline-none"
              max={0.9}
              min={0.05}
              onChange={(e) => onChangeTestFraction(parseFloat(e.target.value) || 0.2)}
              step={0.05}
              type="number"
              value={testFraction}
            />
            <span className="font-mono text-slate-500 whitespace-nowrap">
              ({(testFraction * 100).toFixed(0)}% Test)
            </span>
          </div>
          <p className="mt-1 text-[10px] text-slate-500">Default: 0.20 (80% Train, 20% Test)</p>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-700">
            Random Seed (Reproducibility)
          </label>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 font-mono text-xs text-slate-900 focus:border-teal-700 focus:outline-none"
            min={0}
            onChange={(e) => onChangeRandomSeed(parseInt(e.target.value, 10) || 0)}
            type="number"
            value={randomSeed}
          />
          <p className="mt-1 text-[10px] text-slate-500">Ensures identical splits across experiment runs</p>
        </div>
      </div>
    </div>
  )
}
