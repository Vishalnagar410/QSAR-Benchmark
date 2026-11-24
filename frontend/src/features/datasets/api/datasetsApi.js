import { apiClient, getApiErrorMessage } from '../../../api/client.js'

/**
 * Fetch all registered datasets from the local storage.
 * Backend endpoint: GET /api/datasets
 * Response: { datasets: DatasetMetadataResponse[] }
 */
export async function fetchDatasets(signal) {
  try {
    const response = await apiClient.get('/datasets', { signal })
    return response.data?.datasets ?? []
  } catch (error) {
    throw new Error(getApiErrorMessage(error))
  }
}

/**
 * Fetch a single dataset's metadata by its ID.
 * Backend endpoint: GET /api/datasets/{dataset_id}
 * Response: DatasetMetadataResponse
 */
export async function fetchDataset(datasetId, signal) {
  try {
    const response = await apiClient.get(`/datasets/${encodeURIComponent(datasetId)}`, {
      signal,
    })
    return response.data
  } catch (error) {
    throw new Error(getApiErrorMessage(error))
  }
}

/**
 * Upload a CSV chemical dataset.
 * Backend endpoint: POST /api/datasets/upload
 * Content-Type: multipart/form-data
 * Response: DatasetMetadataResponse
 */
export async function uploadDataset(file, onProgress, signal) {
  if (!file) {
    throw new Error('Please select a CSV file to upload.')
  }

  if (!file.name.toLowerCase().endsWith('.csv')) {
    throw new Error('Only files with a .csv extension are accepted.')
  }

  const formData = new FormData()
  formData.append('file', file)

  try {
    const response = await apiClient.post('/datasets/upload', formData, {
      signal,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          )
          onProgress(percentCompleted)
        }
      },
    })
    return response.data
  } catch (error) {
    throw new Error(getApiErrorMessage(error))
  }
}

/**
 * Trigger scientific validation on an uploaded dataset.
 * Backend endpoint: POST /api/datasets/{dataset_id}/validate
 * Request body: ValidationRequest
 * Response: DatasetValidationResponse
 */
export async function validateDataset(datasetId, payload = {}, signal) {
  const requestBody = {
    selection: {
      endpoint: payload.endpoint || null,
      units: payload.units || null,
      assay_id: payload.assay_id || null,
    },
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
    const response = await apiClient.post(
      `/datasets/${encodeURIComponent(datasetId)}/validate`,
      requestBody,
      { signal },
    )
    return response.data
  } catch (error) {
    throw new Error(getApiErrorMessage(error))
  }
}

/**
 * Fetch the stored validation report for a dataset.
 * Backend endpoint: GET /api/datasets/{dataset_id}/validation-report?format=json|csv
 */
export async function fetchValidationReport(datasetId, format = 'json', signal) {
  try {
    const response = await apiClient.get(
      `/datasets/${encodeURIComponent(datasetId)}/validation-report`,
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
 * Generate features (descriptors and/or Morgan fingerprints) for a validated dataset.
 * Backend endpoint: POST /api/datasets/{dataset_id}/features?format=json|csv
 */
export async function generateFeatures(datasetId, payload = {}, format = 'json', signal) {
  const requestBody = {
    selection: {
      endpoint: payload.endpoint || null,
      units: payload.units || null,
      assay_id: payload.assay_id || null,
    },
    columns: {
      compound_id: payload.columns?.compound_id || 'compound_id',
      smiles: payload.columns?.smiles || 'smiles',
      activity: payload.columns?.activity || 'activity',
      endpoint: payload.columns?.endpoint || 'endpoint',
      units: payload.columns?.units || 'units',
      assay_id: payload.columns?.assay_id || 'assay_id',
    },
    feature_config: {
      include_descriptors: payload.feature_config?.include_descriptors ?? true,
      include_morgan: payload.feature_config?.include_morgan ?? false,
      fingerprint_radius: payload.feature_config?.fingerprint_radius ?? 2,
      fingerprint_n_bits: payload.feature_config?.fingerprint_n_bits ?? 2048,
      fingerprint_include_chirality:
        payload.feature_config?.fingerprint_include_chirality ?? true,
    },
  }

  try {
    const response = await apiClient.post(
      `/datasets/${encodeURIComponent(datasetId)}/features`,
      requestBody,
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
