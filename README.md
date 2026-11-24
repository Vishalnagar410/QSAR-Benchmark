# QSAR-Benchmark

QSAR-Benchmark provides CSV validation, RDKit molecular features, and
leakage-aware fixed-baseline regression through both a Python API and a local
REST API. The initial release is regression only. Activities remain as
provided: endpoints are selected explicitly, units are never inferred or
converted, and duplicate measurements are never aggregated.

## Scientific Python workflow

1. Load a CSV with `load_dataset`; inspect accepted records, exclusions, and
   duplicate-structure audit information.
2. Select one exact endpoint and unit with `prepare_modeling_dataset`.
3. Use a reproducible random or Bemis–Murcko scaffold split.
4. Fit the selected fixed `DummyRegressor`, scaled `Ridge`, and/or
   `RandomForestRegressor` baseline(s) on a shared training partition.
5. Save machine-readable run metadata, scores, and test predictions.

The endpoint and units supplied to preparation must match the validated data.
This workflow does not infer scientific compatibility from endpoint names,
convert units, tune parameters, or establish predictive validity.

## Local API

### Setup and run

The supported local environment is CPython 3.13 on Windows. With uv installed:

```powershell
uv sync
uv run pytest -q
uv run uvicorn backend.app.main:app --reload
```

OpenAPI/Swagger documentation is available at
`http://127.0.0.1:8000/docs`; health is available at
`http://127.0.0.1:8000/api/health`.

The API uses FastAPI/Pydantic for HTTP validation, the existing
`qsar_benchmark` modules for scientific operations, pandas for tabular
responses, and a single-worker local executor for runs.

### Endpoint reference

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | Application status and version |
| `GET` | `/api/version` | Python, RDKit, NumPy, and scikit-learn versions |
| `POST` | `/api/datasets/upload` | Upload a size-limited UTF-8 CSV |
| `GET` | `/api/datasets` | List datasets |
| `GET` | `/api/datasets/{dataset_id}` | Dataset metadata |
| `POST` | `/api/datasets/{dataset_id}/validate` | Run Stage 2 validation and persist an audit |
| `GET` | `/api/datasets/{dataset_id}/validation-report?format=json\|csv` | Download validation diagnostics |
| `POST` | `/api/datasets/{dataset_id}/features?format=json\|csv` | Calculate Stage 2 features |
| `POST` | `/api/experiments` | Validate and create a baseline experiment |
| `GET` | `/api/experiments` | List experiment status/history |
| `GET` | `/api/experiments/{experiment_id}` | Experiment details/status |
| `POST` | `/api/experiments/{experiment_id}/run` | Queue one local run |
| `GET` | `/api/experiments/{experiment_id}/results?format=json\|csv` | Retrieve metrics and run metadata |
| `GET` | `/api/experiments/{experiment_id}/predictions?format=json\|csv` | Download test predictions and residuals |
| `GET` | `/api/experiments/{experiment_id}/report?format=json\|csv` | Download the full machine-readable report |

CSV uploads are limited to 10 MiB by default. Override with
`QSAR_BENCHMARK_MAX_UPLOAD_BYTES`. Storage defaults to `.\data`; override with
`QSAR_BENCHMARK_DATA_DIR`. Generated datasets, reports, and experiments are
excluded from Git. Original uploaded bytes are stored in generated
identifier-based paths; original filenames are sanitized for display, and
absolute storage paths are not returned by the API.

### Example requests

```powershell
curl.exe -F "file=@activity.csv" http://127.0.0.1:8000/api/datasets/upload
```

Use the returned dataset ID:

```powershell
curl.exe -X POST `
  -H "Content-Type: application/json" `
  -d '{"selection":{"endpoint":"Ki","units":"nM"}}' `
  http://127.0.0.1:8000/api/datasets/<dataset_id>/validate
```

Create and run an experiment after choosing one endpoint/unit pair:

```powershell
curl.exe -X POST `
  -H "Content-Type: application/json" `
  -d '{"dataset_id":"<dataset_id>","endpoint":"Ki","units":"nM","feature_config":{"include_descriptors":true},"split_strategy":"random","test_fraction":0.2,"random_seed":42,"selected_models":["dummy_mean","ridge","random_forest"]}' `
  http://127.0.0.1:8000/api/experiments

curl.exe -X POST http://127.0.0.1:8000/api/experiments/<experiment_id>/run
```

Poll `GET /api/experiments/{experiment_id}` for `completed` or `failed`, then
retrieve results, predictions, or the report.

## Storage, safety, and scientific limitations

The local filesystem store is organized into `uploads/`, `datasets/`,
`validation_reports/`, `features/`, and `experiments/{id}/`. IDs are generated
internally and validated before paths are built. CSV contents, not only file
extensions, are parsed before persistence. Writes are atomic or exclusive to
avoid partial and accidental-overwrite results. There is no database,
authentication, multi-user isolation, or distributed execution.

The API invokes the same Stage 2/Stage 3 validation, feature, split, and model
functions used by the Python workflow. It does not standardize salts or
tautomers, convert pActivity or units, aggregate duplicates, tune models, or
claim validation on external experimental data. A random split may place
analogues across partitions; a scaffold split does not prove independent
chemical space. Synthetic test data are illustrative fixtures only.

See [scientific methods](docs/scientific_methods.md),
[evaluation protocol](docs/evaluation_protocol.md),
[limitations](docs/limitations.md), and
[API architecture](docs/architecture.md).
