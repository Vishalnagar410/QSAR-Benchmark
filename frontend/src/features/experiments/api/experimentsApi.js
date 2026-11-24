import { apiClient, getApiErrorMessage } from '../../../api/client.js'

/**
 * Fetch all experiments from the local storage.
 * Backend endpoint: GET /api/experiments
 * Response: { experiments: ExperimentMetadataResponse[] }
 */
export async function fetchExperiments(signal) {
  try {
    const response = await apiClient.get('/experiments', { signal })
    return response.data?.experiments ?? []
  } catch (error) {
    throw new Error(getApiErrorMessage(error))
  }
}

/**
 * Fetch a single experiment by ID.
 * Backend endpoint: GET /api/experiments/{experiment_id}
 * Response: ExperimentMetadataResponse
 */
export async function fetchExperiment(experimentId, signal) {
  try {
    const response = await apiClient.get(
      `/experiments/${encodeURIComponent(experimentId)}`,
      { signal },
    )
    return response.data
  } catch (error) {
    throw new Error(getApiErrorMessage(error))
  }
}

/**
 * Create a new experiment configuration.
 * Backend endpoint: POST /api/experiments
 * Request body: ExperimentRequest
 * Response: ExperimentMetadataResponse (HTTP 201)
 */
export async function createExperiment(payload, signal) {
  if (!payload.dataset_id) {
    throw new Error('Please select a dataset for the experiment.')
  }
  if (!payload.endpoint?.trim()) {
    throw new Error('Target activity endpoint is required.')
  }
  if (!payload.units?.trim()) {
    throw new Error('Target activity units are required.')
  }
  if (!payload.selected_models || payload.selected_models.length === 0) {
    throw new Error('At least one estimator model must be selected.')
  }

  const requestBody = {
    dataset_id: payload.dataset_id,
    endpoint: payload.endpoint.trim(),
    units: payload.units.trim(),
    assay_id: payload.assay_id?.trim() || null,
    feature_config: {
      include_descriptors: payload.feature_config?.include_descriptors ?? true,
      include_morgan: payload.feature_config?.include_morgan ?? false,
      fingerprint_radius: Number(payload.feature_config?.fingerprint_radius ?? 2),
      fingerprint_n_bits: Number(payload.feature_config?.fingerprint_n_bits ?? 2048),
      fingerprint_include_chirality:
        payload.feature_config?.fingerprint_include_chirality ?? true,
    },
    split_strategy: payload.split_strategy || 'random',
    test_fraction: Number(payload.test_fraction ?? 0.2),
    random_seed: Number(payload.random_seed ?? 42),
    selected_models: Array.from(new Set(payload.selected_models)),
    columns: {
      compound_id: payload.columns?.compound_id || 'compound_id',
      smiles: payload.columns?.smiles || 'smiles',
      activity: payload.columns?.activity || 'activity',
      endpoint: payload.columns?.endpoint || 'endpoint',
      units: payload.columns?.units || 'units',
      assay_id: payload.columns?.assay_id || 'assay_id',
    },
  }

  try {
    const response = await apiClient.post('/experiments', requestBody, { signal })
    return response.data
  } catch (error) {
    throw new Error(getApiErrorMessage(error))
  }
}

/**
 * Enqueue an experiment for background execution.
 * Backend endpoint: POST /api/experiments/{experiment_id}/run
 * Response: ExperimentMetadataResponse (HTTP 202)
 */
export async function runExperiment(experimentId, signal) {
  try {
    const response = await apiClient.post(
      `/experiments/${encodeURIComponent(experimentId)}/run`,
      {},
      { signal },
    )
    return response.data
  } catch (error) {
    throw new Error(getApiErrorMessage(error))
  }
}

/**
 * Fetch experiment benchmark results.
 * Backend endpoint: GET /api/experiments/{experiment_id}/results?format=json|csv
 * Prerequisite: status === 'completed'
 */
export async function fetchExperimentResults(experimentId, format = 'json', signal) {
  try {
    const response = await apiClient.get(
      `/experiments/${encodeURIComponent(experimentId)}/results`,
      {
        params: { format },
        responseType: format === 'csv' ? 'blob' : 'json',
        signal,
      },
    )
    return response.data
  } catch (error) {
    throw new Error(getApiErrorMessage(error))
  }
}

/**
 * Fetch model compound predictions.
 * Backend endpoint: GET /api/experiments/{experiment_id}/predictions?format=json|csv
 * Prerequisite: status === 'completed'
 */
export async function fetchExperimentPredictions(experimentId, format = 'json', signal) {
  try {
    const response = await apiClient.get(
      `/experiments/${encodeURIComponent(experimentId)}/predictions`,
      {
        params: { format },
        responseType: format === 'csv' ? 'blob' : 'json',
        signal,
      },
    )
    return response.data
  } catch (error) {
    throw new Error(getApiErrorMessage(error))
  }
}

/**
 * Fetch complete experiment evaluation report.
 * Backend endpoint: GET /api/experiments/{experiment_id}/report?format=json|csv
 * Prerequisite: status === 'completed'
 */
export async function fetchExperimentReport(experimentId, format = 'json', signal) {
  try {
    const response = await apiClient.get(
      `/experiments/${encodeURIComponent(experimentId)}/report`,
      {
        params: { format },
        responseType: format === 'csv' ? 'blob' : 'json',
        signal,
      },
    )
    return response.data
  } catch (error) {
    throw new Error(getApiErrorMessage(error))
  }
}
