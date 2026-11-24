# Stage 4A local API architecture

## Components

The API is exposed as `backend.app.main:app` and is composed of three routers:

* `health.py` reports application and scientific dependency versions.
* `datasets.py` handles CSV upload, dataset metadata, Stage 2 validation,
  feature generation, and validation downloads.
* `experiments.py` creates, runs, tracks, and returns experiments/results.

Pydantic request models reject unknown fields and validate split options,
feature settings, model selections, and required endpoint/unit inputs.
`LocalStorage` owns all filesystem access. `datasets.py` and
`experiments.py` services call the existing `qsar_benchmark` engine; the API
does not independently calculate molecular features, splits, or metrics.

## Request/data flow

1. Upload reads a bounded request body, checks the `.csv` suffix, decodes UTF-8,
   verifies CSV structure, and stores the original bytes at an internally
   generated identifier path.
2. Dataset validation uses `load_dataset` with explicit Stage 2 column mapping
   and optional endpoint/unit selection. Its accepted records, exclusions,
   duplicate groups, and source-row references form the saved audit.
3. Feature requests call the same validator and feature generator and persist
   tabular output generated from accepted records only.
4. Experiment creation reloads the uploaded CSV through Stage 2, constructs a
   Stage 3 `ModelingDataset`, and creates the requested split once to reject
   infeasible configurations before accepting the experiment.
5. The single-worker executor transitions `created → queued → running →
   completed|failed`. It uses Stage 3 `run_benchmark` with the selected
   baselines and writes results, prediction/residual CSV, and a JSON report.
6. Results are available only after completion. Status, split identity, model
   settings, metrics, predictions, software versions, and warnings are
   persisted without exposing filesystem paths.

## Local storage

The storage root is `data/` by default, configurable using
`QSAR_BENCHMARK_DATA_DIR`. The API creates:

```text
data/
├── uploads/{dataset_id}.csv
├── datasets/{dataset_id}.json
├── validation_reports/{dataset_id}.json
├── features/{dataset_id}.csv
└── experiments/{experiment_id}/
    ├── metadata.json
    ├── results.json
    ├── predictions.csv
    └── report.json
```

Opaque IDs are validated before storage paths are resolved. Uploads and
experiment outputs use exclusive creation; metadata and feature tables use
temporary files and atomic replacement. Uploaded original bytes are preserved.
The store is local, single-process storage, not a transactional database.

The maximum accepted upload is 10 MiB by default and can be changed through
`QSAR_BENCHMARK_MAX_UPLOAD_BYTES`. CORS allows only the configured local
frontend origins (`localhost:5173` and `127.0.0.1:5173`); credentials are
disabled. No authentication or multi-user access control is included.

## Scientific interface changes

Stage 3's baseline evaluation accepts an optional list of fixed model names so
the API can fit only the models selected by a caller while reusing the same
split/evaluation safeguards. Results also expose actual and predicted test
values alongside their sample identities, allowing the API to report
residuals without refitting models or inspecting the test set for selection.

Only the selected endpoint and exact units are used. No unit conversion,
imputation, aggregation, hyperparameter search, or feature selection is
performed. Scaffold groups remain intact; acyclic compounds share the empty
Murcko scaffold. Neither split strategy proves external or prospective model
validity.

## Validation and startup

Run all scientific and API tests with `uv run pytest -q`. Start the local
server from the repository root with:

```powershell
uv run uvicorn backend.app.main:app --reload
```

FastAPI OpenAPI documentation is served at `/docs` and health is available at
`/api/health`.
