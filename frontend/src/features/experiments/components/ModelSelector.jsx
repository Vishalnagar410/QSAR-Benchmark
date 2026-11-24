import { BarChart3, Binary, Layers } from 'lucide-react'

const AVAILABLE_MODELS = [
  {
    id: 'dummy_mean',
    name: 'Dummy Regressor (Mean Baseline)',
    category: 'Baseline Control',
    icon: BarChart3,
    description:
      'Predicts the mean training target for every test compound. Establishes the non-trivial performance baseline (R² ≈ 0.0) to guard against illusory model accuracy.',
  },
  {
    id: 'ridge',
    name: 'Ridge Regression',
    category: 'Linear Model',
    icon: Binary,
    description:
      'L2-regularized linear regression with shrinkage penalty. Highly robust against feature collinearity and provides an interpretable linear benchmark.',
  },
  {
    id: 'random_forest',
    name: 'Random Forest Regressor',
    category: 'Non-linear Ensemble',
    icon: Layers,
    description:
      'Ensemble of decision trees trained on bootstrapped subsets. Models non-linear structure-activity relationships and higher-order molecular interactions.',
  },
]

export default function ModelSelector({ selectedModels = [], onChangeModels }) {
  function toggleModel(modelId) {
    if (selectedModels.includes(modelId)) {
      if (selectedModels.length > 1) {
        onChangeModels(selectedModels.filter((id) => id !== modelId))
      }
    } else {
      onChangeModels([...selectedModels, modelId])
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Estimator Selection
          </h3>
          <p className="text-xs text-slate-500">
            Select one or more machine learning models for standardized comparative evaluation
          </p>
        </div>
        <span className="text-xs font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
          {selectedModels.length} of {AVAILABLE_MODELS.length} selected
        </span>
      </div>

      <div className="space-y-2.5">
        {AVAILABLE_MODELS.map((model) => {
          const isSelected = selectedModels.includes(model.id)
          const Icon = model.icon

          return (
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all ${
                isSelected
                  ? 'border-teal-600 bg-teal-50/30 ring-1 ring-teal-600 shadow-2xs'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
              key={model.id}
            >
              <input
                checked={isSelected}
                className="mt-1 size-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                onChange={() => toggleModel(model.id)}
                type="checkbox"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Icon className="size-4 text-teal-700" />
                  <span className="text-xs font-bold text-slate-900">
                    {model.name}
                  </span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                    {model.category}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                  {model.description}
                </p>
              </div>
            </label>
          )
        })}
      </div>
    </div>
  )
}
