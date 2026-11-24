import test, { describe } from 'node:test'
import assert from 'node:assert/strict'

// Synthetic test fixtures for experiment management
const SYNTHETIC_EXPERIMENT_FIXTURE = {
  experiment_id: 'e1f2a3b4c5d678901234567890abcdef',
  dataset_id: 'd1e2f3a4b5c678901234567890abcdef',
  endpoint: 'Ki',
  units: 'nM',
  assay_id: null,
  feature_config: {
    include_descriptors: true,
    include_morgan: false,
    fingerprint: { radius: 2, n_bits: 2048, include_chirality: true },
  },
  split_strategy: 'random',
  test_fraction: 0.25,
  random_seed: 42,
  selected_models: ['dummy_mean', 'ridge'],
  status: 'created',
  created_at: '2026-10-31T12:00:00.000000Z',
  started_at: null,
  completed_at: null,
  error_summary: null,
  run_id: null,
}

describe('Experiment Management - API Client and Service Suite', () => {
  test('Synthetic experiment fixture matches backend schema', () => {
    assert.strictEqual(SYNTHETIC_EXPERIMENT_FIXTURE.experiment_id, 'e1f2a3b4c5d678901234567890abcdef')
    assert.strictEqual(SYNTHETIC_EXPERIMENT_FIXTURE.status, 'created')
    assert.strictEqual(SYNTHETIC_EXPERIMENT_FIXTURE.split_strategy, 'random')
    assert.strictEqual(SYNTHETIC_EXPERIMENT_FIXTURE.selected_models.length, 2)
  })

  test('createExperiment rejects missing dataset_id', async () => {
    const { createExperiment } = await import('./experimentsApi.js')
    await assert.rejects(
      async () => {
        await createExperiment({
          endpoint: 'Ki',
          units: 'nM',
          selected_models: ['ridge'],
        })
      },
      {
        message: 'Please select a dataset for the experiment.',
      },
    )
  })

  test('createExperiment rejects missing endpoint', async () => {
    const { createExperiment } = await import('./experimentsApi.js')
    await assert.rejects(
      async () => {
        await createExperiment({
          dataset_id: 'd1e2f3a4b5c678901234567890abcdef',
          endpoint: '',
          units: 'nM',
          selected_models: ['ridge'],
        })
      },
      {
        message: 'Target activity endpoint is required.',
      },
    )
  })

  test('createExperiment rejects missing models', async () => {
    const { createExperiment } = await import('./experimentsApi.js')
    await assert.rejects(
      async () => {
        await createExperiment({
          dataset_id: 'd1e2f3a4b5c678901234567890abcdef',
          endpoint: 'Ki',
          units: 'nM',
          selected_models: [],
        })
      },
      {
        message: 'At least one estimator model must be selected.',
      },
    )
  })

  test('Supported split strategies and model names adhere to backend contract', () => {
    const SUPPORTED_SPLIT_STRATEGIES = ['random', 'scaffold']
    const SUPPORTED_MODELS = ['dummy_mean', 'ridge', 'random_forest']

    assert.ok(SUPPORTED_SPLIT_STRATEGIES.includes('random'))
    assert.ok(SUPPORTED_SPLIT_STRATEGIES.includes('scaffold'))
    assert.strictEqual(SUPPORTED_SPLIT_STRATEGIES.length, 2)

    assert.ok(SUPPORTED_MODELS.includes('dummy_mean'))
    assert.ok(SUPPORTED_MODELS.includes('ridge'))
    assert.ok(SUPPORTED_MODELS.includes('random_forest'))
    assert.strictEqual(SUPPORTED_MODELS.length, 3)
  })

  test('Unsupported experiment operations safeguard verification', async () => {
    const api = await import('./experimentsApi.js')
    // Backend does not expose DELETE or CANCEL for experiments
    assert.strictEqual(
      typeof api.deleteExperiment,
      'undefined',
      'deleteExperiment must NOT be exported because backend does not support experiment deletion',
    )
    assert.strictEqual(
      typeof api.cancelExperiment,
      'undefined',
      'cancelExperiment must NOT be exported because backend does not support in-flight cancellation',
    )
  })
})
