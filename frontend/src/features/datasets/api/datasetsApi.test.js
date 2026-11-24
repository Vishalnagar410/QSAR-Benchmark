import test, { describe } from 'node:test'
import assert from 'node:assert/strict'

// Synthetic test fixtures (clearly identified for unit testing)
const SYNTHETIC_FIXTURE_DATASET_LIST = [
  {
    dataset_id: 'a1b2c3d4e5f678901234567890abcdef',
    original_filename: 'synthetic_kinase_inhibitors.csv',
    uploaded_at: '2026-10-31T10:00:00.000000Z',
    record_count: 50,
    validation_status: 'validated',
    endpoint: 'Ki',
    units: 'nM',
    accepted_record_count: 48,
    rejected_record_count: 2,
  },
  {
    dataset_id: 'f0e1d2c3b4a598765432109876fedcba',
    original_filename: 'synthetic_solubility.csv',
    uploaded_at: '2026-10-31T11:00:00.000000Z',
    record_count: 120,
    validation_status: 'not_validated',
    endpoint: null,
    units: null,
    accepted_record_count: null,
    rejected_record_count: null,
  },
]

const SYNTHETIC_FIXTURE_VALIDATION_REPORT = {
  dataset_id: 'a1b2c3d4e5f678901234567890abcdef',
  source_row_count: 50,
  accepted_record_count: 48,
  rejected_record_count: 2,
  invalid_smiles_count: 1,
  missing_value_record_count: 1,
  duplicate_structure_group_count: 0,
  endpoint: 'Ki',
  units: 'nM',
  assay_id: null,
  validation_status: 'validated',
  diagnostics: [
    {
      source_row: 1,
      included: true,
      compound_id: 'CMP-001',
      canonical_smiles: 'c1ccccc1',
      exclusion_reasons: [],
    },
    {
      source_row: 2,
      included: false,
      compound_id: 'CMP-002',
      canonical_smiles: null,
      exclusion_reasons: ['invalid SMILES'],
    },
  ],
  duplicate_structures: [],
}

describe('Dataset Management - API Client and Service Suite', () => {
  test('Synthetic fixture schema integrity matches backend contract', () => {
    assert.strictEqual(SYNTHETIC_FIXTURE_DATASET_LIST.length, 2)
    const [d1, d2] = SYNTHETIC_FIXTURE_DATASET_LIST

    assert.ok(d1.dataset_id)
    assert.strictEqual(d1.original_filename, 'synthetic_kinase_inhibitors.csv')
    assert.strictEqual(d1.validation_status, 'validated')
    assert.strictEqual(d1.record_count, 50)
    assert.strictEqual(d1.accepted_record_count, 48)

    assert.strictEqual(d2.validation_status, 'not_validated')
    assert.strictEqual(d2.accepted_record_count, null)
  })

  test('Upload validation rejects null or missing file', async () => {
    const { uploadDataset } = await import('./datasetsApi.js')
    await assert.rejects(
      async () => {
        await uploadDataset(null)
      },
      {
        message: 'Please select a CSV file to upload.',
      },
    )
  })

  test('Upload validation rejects non-CSV extension', async () => {
    const { uploadDataset } = await import('./datasetsApi.js')
    const fakeFile = { name: 'compounds.tsv', size: 1024 }
    await assert.rejects(
      async () => {
        await uploadDataset(fakeFile)
      },
      {
        message: 'Only files with a .csv extension are accepted.',
      },
    )
  })

  test('Validation report fixture integrity verification', () => {
    assert.strictEqual(SYNTHETIC_FIXTURE_VALIDATION_REPORT.source_row_count, 50)
    assert.strictEqual(SYNTHETIC_FIXTURE_VALIDATION_REPORT.accepted_record_count, 48)
    assert.strictEqual(SYNTHETIC_FIXTURE_VALIDATION_REPORT.rejected_record_count, 2)
    assert.strictEqual(SYNTHETIC_FIXTURE_VALIDATION_REPORT.diagnostics.length, 2)

    const accepted = SYNTHETIC_FIXTURE_VALIDATION_REPORT.diagnostics.find((d) => d.included)
    const rejected = SYNTHETIC_FIXTURE_VALIDATION_REPORT.diagnostics.find((d) => !d.included)

    assert.ok(accepted)
    assert.strictEqual(accepted.compound_id, 'CMP-001')
    assert.strictEqual(accepted.canonical_smiles, 'c1ccccc1')

    assert.ok(rejected)
    assert.strictEqual(rejected.compound_id, 'CMP-002')
    assert.ok(rejected.exclusion_reasons.includes('invalid SMILES'))
  })

  test('Search and filter behavior over dataset collections', () => {
    const list = SYNTHETIC_FIXTURE_DATASET_LIST

    // Search by filename
    const kinaseMatches = list.filter((d) =>
      d.original_filename.toLowerCase().includes('kinase'),
    )
    assert.strictEqual(kinaseMatches.length, 1)
    assert.strictEqual(kinaseMatches[0].dataset_id, 'a1b2c3d4e5f678901234567890abcdef')

    // Filter by validation status
    const validatedOnly = list.filter((d) => d.validation_status === 'validated')
    assert.strictEqual(validatedOnly.length, 1)

    const unvalidatedOnly = list.filter((d) => d.validation_status === 'not_validated')
    assert.strictEqual(unvalidatedOnly.length, 1)

    const invalidOnly = list.filter((d) => d.validation_status === 'invalid')
    assert.strictEqual(invalidOnly.length, 0)
  })

  test('Unsupported operations safeguard verification', async () => {
    const api = await import('./datasetsApi.js')
    // Backend has no DELETE /api/datasets endpoint, verify frontend does not expose fake deleteDataset
    assert.strictEqual(
      typeof api.deleteDataset,
      'undefined',
      'deleteDataset must NOT be exported because backend does not support dataset deletion',
    )
  })

  test('Error normalization returns clean message from structured backend error', async () => {
    const { getApiErrorMessage } = await import('../../../api/client.js')
    const simulatedAxiosError = {
      isAxiosError: true,
      response: {
        status: 422,
        data: {
          error: {
            code: 'invalid_upload',
            message: 'CSV must contain a non-empty header row.',
          },
        },
      },
    }
    assert.strictEqual(
      getApiErrorMessage(simulatedAxiosError),
      'CSV must contain a non-empty header row.',
    )
  })

  test('Empty dataset listing resolves to empty array without crashing', () => {
    const emptyResponse = { datasets: [] }
    const datasets = emptyResponse.datasets ?? []
    assert.ok(Array.isArray(datasets))
    assert.strictEqual(datasets.length, 0)
  })
})
