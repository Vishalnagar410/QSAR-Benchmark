import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Database,
  FlaskConical,
  Loader2,
  Sparkles,
} from 'lucide-react'
import PageContainer from '../../../components/common/PageContainer.jsx'
import { createExperiment, runExperiment } from '../api/experimentsApi.js'
import DatasetSelector from '../components/DatasetSelector.jsx'
import FeatureConfigSelector from '../components/FeatureConfigSelector.jsx'
import ModelSelector from '../components/ModelSelector.jsx'
import SplitConfiguration from '../components/SplitConfiguration.jsx'

export default function CreateExperimentPage() {
  const [selectedDataset, setSelectedDataset] = useState(null)
  const [endpoint, setEndpoint] = useState('')
  const [units, setUnits] = useState('')
  const [assayId, setAssayId] = useState('')

  const [featureConfig, setFeatureConfig] = useState({
    include_descriptors: true,
    include_morgan: false,
    fingerprint_radius: 2,
    fingerprint_n_bits: 2048,
    fingerprint_include_chirality: true,
  })

  const [splitStrategy, setSplitStrategy] = useState('random')
  const [testFraction, setTestFraction] = useState(0.2)
  const [randomSeed, setRandomSeed] = useState(42)

  const [selectedModels, setSelectedModels] = useState(['dummy_mean', 'ridge'])

  const [submitting, setSubmitting] = useState(false)
  const [launchAfterCreate, setLaunchAfterCreate] = useState(true)
  const [error, setError] = useState(null)

  const navigate = useNavigate()

  function handleSelectDataset(dataset) {
    setSelectedDataset(dataset)
    if (dataset.endpoint) setEndpoint(dataset.endpoint)
    if (dataset.units) setUnits(dataset.units)
    setError(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!selectedDataset) {
      setError('Please select a validated dataset.')
      return
    }

    if (!endpoint.trim()) {
      setError('Please provide a target activity endpoint name (e.g. Ki, IC50).')
      return
    }

    if (!units.trim()) {
      setError('Please provide target activity units (e.g. nM, µM).')
      return
    }

    if (!selectedModels.length) {
      setError('Please select at least one estimator model to benchmark.')
      return
    }

    if (testFraction <= 0 || testFraction >= 1) {
      setError('Test set fraction must be strictly between 0 and 1.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const payload = {
        dataset_id: selectedDataset.dataset_id,
        endpoint: endpoint.trim(),
        units: units.trim(),
        assay_id: assayId.trim() || null,
        feature_config: featureConfig,
        split_strategy: splitStrategy,
        test_fraction: testFraction,
        random_seed: randomSeed,
        selected_models: selectedModels,
      }

      const created = await createExperiment(payload)

      if (launchAfterCreate) {
        try {
          await runExperiment(created.experiment_id)
        } catch (runErr) {
          console.warn('Experiment created but could not immediately launch:', runErr)
        }
      }

      navigate(`/experiments/${created.experiment_id}`)
    } catch (err) {
      setError(err.message || 'Failed to create experiment.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageContainer
      actions={
        <Link
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-700"
          to="/experiments"
        >
          <ArrowLeft aria-hidden="true" size={14} />
          Back to Experiments
        </Link>
      }
      description="Configure a transparent, reproducible benchmark experiment using standardized molecular representations and baseline estimators."
      eyebrow="Experiment Setup"
      title="New Benchmarking Experiment"
    >
      <form className="space-y-6" onSubmit={handleSubmit}>
        {error && (
          <div
            aria-live="polite"
            className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800"
            role="alert"
          >
            <AlertCircle className="mt-0.5 shrink-0 text-rose-600" size={16} />
            <div>
              <p className="font-semibold text-rose-950">Configuration Error</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* 1. Dataset Selection */}
        <section aria-labelledby="dataset-section-title">
          <DatasetSelector
            onSelectDataset={handleSelectDataset}
            selectedDatasetId={selectedDataset?.dataset_id}
          />
        </section>

        {/* 2. Target Endpoint & Units */}
        {selectedDataset && (
          <section
            aria-labelledby="target-section-title"
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3"
          >
            <div>
              <h3 className="text-sm font-semibold text-slate-900" id="target-section-title">
                Target Endpoint & Unit Verification
              </h3>
              <p className="text-xs text-slate-500">
                Confirm the biological activity endpoint to be predicted for {selectedDataset.original_filename}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700">
                  Endpoint Name *
                </label>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 font-mono text-xs text-slate-900 focus:border-teal-700 focus:outline-none"
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder="e.g. Ki, IC50"
                  required
                  type="text"
                  value={endpoint}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700">
                  Target Units *
                </label>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 font-mono text-xs text-slate-900 focus:border-teal-700 focus:outline-none"
                  onChange={(e) => setUnits(e.target.value)}
                  placeholder="e.g. nM, µM"
                  required
                  type="text"
                  value={units}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700">
                  Assay ID (Optional)
                </label>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 font-mono text-xs text-slate-900 focus:border-teal-700 focus:outline-none"
                  onChange={(e) => setAssayId(e.target.value)}
                  placeholder="Leave empty if not filtered"
                  type="text"
                  value={assayId}
                />
              </div>
            </div>
          </section>
        )}

        {/* 3. Feature Configuration */}
        {selectedDataset && (
          <section aria-labelledby="features-section-title">
            <FeatureConfigSelector
              featureConfig={featureConfig}
              onChangeFeatureConfig={setFeatureConfig}
            />
          </section>
        )}

        {/* 4. Split Strategy */}
        {selectedDataset && (
          <section aria-labelledby="split-section-title">
            <SplitConfiguration
              onChangeRandomSeed={setRandomSeed}
              onChangeSplitStrategy={setSplitStrategy}
              onChangeTestFraction={setTestFraction}
              randomSeed={randomSeed}
              splitStrategy={splitStrategy}
              testFraction={testFraction}
            />
          </section>
        )}

        {/* 5. Estimator Selection */}
        {selectedDataset && (
          <section aria-labelledby="models-section-title">
            <ModelSelector
              onChangeModels={setSelectedModels}
              selectedModels={selectedModels}
            />
          </section>
        )}

        {/* Review & Launch Bar */}
        {selectedDataset && (
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-5 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                checked={launchAfterCreate}
                className="size-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                onChange={(e) => setLaunchAfterCreate(e.target.checked)}
                type="checkbox"
              />
              <span>Start experiment immediately upon creation</span>
            </label>

            <div className="flex items-center gap-2">
              <Link
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                to="/experiments"
              >
                Cancel
              </Link>
              <button
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-teal-700 disabled:opacity-50"
                disabled={submitting || !selectedDataset}
                type="submit"
              >
                {submitting ? (
                  <>
                    <Loader2 aria-hidden="true" className="animate-spin" size={14} />
                    Validating & Creating...
                  </>
                ) : (
                  'Create Experiment'
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </PageContainer>
  )
}
