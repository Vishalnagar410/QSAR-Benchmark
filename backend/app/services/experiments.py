"""Experiment validation, single-worker execution, and result persistence."""

from __future__ import annotations

import json
import logging
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from typing import Any

import pandas as pd

from backend.app.core.storage import LocalStorage
from backend.app.schemas.api import ExperimentRequest
from backend.app.services.datasets import load_validated_data
from qsar_benchmark.config import DatasetSelection
from qsar_benchmark.pipelines import prepare_modeling_dataset, run_benchmark
from qsar_benchmark.splitting import split_dataset

logger = logging.getLogger(__name__)


def _now() -> str:
    return datetime.now(UTC).isoformat()


def create_experiment(
    storage: LocalStorage,
    request: ExperimentRequest,
) -> dict[str, Any]:
    selection = DatasetSelection(
        endpoint=request.endpoint,
        units=request.units,
        assay_id=request.assay_id,
    )
    column_mapping = request.columns.to_domain()
    dataset = load_validated_data(
        storage,
        request.dataset_id,
        selection=selection,
        columns=column_mapping,
        feature_config=request.feature_config.to_domain(),
    )
    modeling_data = prepare_modeling_dataset(
        dataset,
        endpoint=request.endpoint,
        units=request.units,
    )
    split_dataset(
        modeling_data,
        strategy=request.split_strategy,
        test_fraction=request.test_fraction,
        random_seed=request.random_seed,
    )

    experiment_id = storage.new_id()
    metadata: dict[str, Any] = {
        "experiment_id": experiment_id,
        "dataset_id": request.dataset_id,
        "endpoint": request.endpoint,
        "units": request.units,
        "assay_id": request.assay_id,
        "feature_config": request.feature_config.as_dict(),
        "columns": request.columns.model_dump(),
        "split_strategy": request.split_strategy,
        "test_fraction": request.test_fraction,
        "random_seed": request.random_seed,
        "selected_models": list(request.selected_models),
        "status": "created",
        "created_at": _now(),
        "started_at": None,
        "completed_at": None,
        "error_summary": None,
    }
    return storage.create_experiment(metadata)


def _configuration_from_metadata(metadata: dict[str, Any]):
    from backend.app.schemas.api import (
        ColumnMappingRequest,
        FeatureConfigurationRequest,
    )

    feature = metadata["feature_config"]
    fingerprint = feature["fingerprint"]
    feature_config = FeatureConfigurationRequest(
        include_descriptors=feature["include_descriptors"],
        include_morgan=feature["include_morgan"],
        fingerprint_radius=fingerprint["radius"],
        fingerprint_n_bits=fingerprint["n_bits"],
        fingerprint_include_chirality=fingerprint["include_chirality"],
    )
    columns = ColumnMappingRequest(**metadata["columns"]).to_domain()
    selection = DatasetSelection(
        endpoint=metadata["endpoint"],
        units=metadata["units"],
        assay_id=metadata.get("assay_id"),
    )
    return feature_config, columns, selection


class ExperimentRunner:
    """Serialize local experiment work and persist visible execution states."""

    def __init__(self, storage: LocalStorage) -> None:
        self.storage = storage
        self._lock = threading.RLock()
        self._executor = ThreadPoolExecutor(
            max_workers=1,
            thread_name_prefix="qsar-experiment",
        )
        self._closed = False

    def start(self, experiment_id: str) -> dict[str, Any]:
        with self._lock:
            if self._closed:
                raise RuntimeError("Experiment execution is shutting down.")
            metadata = self.storage.get_experiment(experiment_id)
            if metadata["status"] != "created":
                raise RuntimeError(
                    f"Experiment cannot run from status {metadata['status']!r}."
                )
            if any(
                item["status"] in {"queued", "running"}
                for item in self.storage.list_experiments()
            ):
                raise RuntimeError("Another experiment is already queued or running.")
            self.storage.update_experiment(
                experiment_id,
                {"status": "queued", "error_summary": None},
            )
            try:
                self._executor.submit(self._execute, experiment_id)
            except Exception:
                self.storage.update_experiment(
                    experiment_id,
                    {
                        "status": "failed",
                        "completed_at": _now(),
                        "error_summary": "Experiment could not be scheduled.",
                    },
                )
                raise
            return self.storage.get_experiment(experiment_id)

    def _execute(self, experiment_id: str) -> None:
        self.storage.update_experiment(
            experiment_id,
            {"status": "running", "started_at": _now()},
        )
        try:
            metadata = self.storage.get_experiment(experiment_id)
            feature_config, columns, selection = _configuration_from_metadata(metadata)
            validated = load_validated_data(
                self.storage,
                metadata["dataset_id"],
                selection=selection,
                columns=columns,
                feature_config=feature_config.to_domain(),
            )
            modeling_data = prepare_modeling_dataset(
                validated,
                endpoint=metadata["endpoint"],
                units=metadata["units"],
            )
            run = run_benchmark(
                modeling_data,
                split_strategy=metadata["split_strategy"],
                test_fraction=metadata["test_fraction"],
                random_seed=metadata["random_seed"],
                model_names=tuple(metadata["selected_models"]),
            )
            run_dict = run.to_dict()
            completed_at = _now()
            prediction_rows: list[dict[str, Any]] = []
            for model in run.model_results:
                for compound_id, source_row, actual, predicted in zip(
                    model.test_compound_ids,
                    model.test_source_rows,
                    model.test_actual_values,
                    model.test_predicted_values,
                    strict=True,
                ):
                    prediction_rows.append(
                        {
                            "model": model.model_name,
                            "compound_id": compound_id,
                            "source_row": source_row,
                            "actual": actual,
                            "predicted": predicted,
                            "residual": actual - predicted,
                        }
                    )
            prediction_frame = pd.DataFrame.from_records(prediction_rows)
            experiment_report = {
                "experiment": {
                    **metadata,
                    "status": "completed",
                    "started_at": self.storage.get_experiment(experiment_id)[
                        "started_at"
                    ],
                    "completed_at": completed_at,
                },
                "benchmark": run_dict,
                "predictions": prediction_rows,
                "limitations": list(run.warnings),
            }
            self.storage.save_experiment_output(
                experiment_id,
                "results.json",
                json.dumps(run_dict, indent=2, sort_keys=True, allow_nan=False) + "\n",
            )
            self.storage.save_experiment_output(
                experiment_id,
                "predictions.csv",
                prediction_frame.to_csv(index=False, lineterminator="\n"),
            )
            self.storage.save_experiment_output(
                experiment_id,
                "report.json",
                json.dumps(
                    experiment_report,
                    indent=2,
                    sort_keys=True,
                    allow_nan=False,
                )
                + "\n",
            )
            self.storage.update_experiment(
                experiment_id,
                {
                    "status": "completed",
                    "completed_at": completed_at,
                    "run_id": run.run_id,
                },
            )
        except Exception as error:
            logger.exception("Experiment %s failed.", experiment_id)
            try:
                self.storage.update_experiment(
                    experiment_id,
                    {
                        "status": "failed",
                        "completed_at": _now(),
                        "error_code": type(error).__name__,
                        "error_summary": (
                            "Experiment failed during scientific validation or execution."
                        ),
                    },
                )
            except Exception:
                logger.exception(
                    "Could not persist failure state for experiment %s.",
                    experiment_id,
                )

    def shutdown(self) -> None:
        with self._lock:
            if self._closed:
                return
            self._closed = True
        self._executor.shutdown(wait=True, cancel_futures=False)
