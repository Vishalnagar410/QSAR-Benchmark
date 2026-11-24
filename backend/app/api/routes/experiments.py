"""Experiment creation, execution, status, and result endpoints."""

from __future__ import annotations

import json

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import Response

from backend.app.api.dependencies import get_experiment_runner, get_storage
from backend.app.core.storage import LocalStorage
from backend.app.schemas.api import (
    BenchmarkResultsResponse,
    DownloadFormat,
    ExperimentListResponse,
    ExperimentMetadataResponse,
    ExperimentRequest,
    PredictionResponse,
)
from backend.app.services.experiments import ExperimentRunner, create_experiment

router = APIRouter(prefix="/experiments", tags=["experiments"])


def _public_experiment(metadata: dict) -> dict:
    fields = (
        "experiment_id",
        "dataset_id",
        "endpoint",
        "units",
        "assay_id",
        "assay_id",
        "feature_config",
        "split_strategy",
        "test_fraction",
        "random_seed",
        "selected_models",
        "status",
        "created_at",
        "started_at",
        "completed_at",
        "error_summary",
        "run_id",
    )
    return {key: metadata.get(key) for key in fields}


def _require_completed(storage: LocalStorage, experiment_id: str) -> dict:
    metadata = storage.get_experiment(experiment_id)
    if metadata["status"] != "completed":
        raise HTTPException(
            status_code=409,
            detail=f"Experiment results are unavailable while status is {metadata['status']}.",
        )
    return metadata


@router.post(
    "",
    status_code=201,
    response_model=ExperimentMetadataResponse,
)
def post_experiment(
    body: ExperimentRequest,
    storage: LocalStorage = Depends(get_storage),
) -> dict:
    metadata = create_experiment(storage, body)
    return _public_experiment(metadata)


@router.get("", response_model=ExperimentListResponse)
def list_experiments(storage: LocalStorage = Depends(get_storage)) -> dict:
    return {
        "experiments": [
            _public_experiment(item) for item in storage.list_experiments()
        ]
    }


@router.get(
    "/{experiment_id}",
    response_model=ExperimentMetadataResponse,
)
def get_experiment(
    experiment_id: str,
    storage: LocalStorage = Depends(get_storage),
) -> dict:
    return _public_experiment(storage.get_experiment(experiment_id))


@router.post(
    "/{experiment_id}/run",
    status_code=202,
    response_model=ExperimentMetadataResponse,
)
def run_experiment(
    experiment_id: str,
    runner: ExperimentRunner = Depends(get_experiment_runner),
) -> dict:
    try:
        metadata = runner.start(experiment_id)
    except RuntimeError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    return _public_experiment(metadata)


@router.get(
    "/{experiment_id}/results",
    response_model=BenchmarkResultsResponse,
)
def get_experiment_results(
    experiment_id: str,
    response: Response,
    format: DownloadFormat = Query(default="json"),
    storage: LocalStorage = Depends(get_storage),
) -> dict | Response:
    _require_completed(storage, experiment_id)
    result_path = storage.get_experiment_output(experiment_id, "results.json")
    result = json.loads(result_path.read_text(encoding="utf-8"))
    if format == "csv":
        table = pd.DataFrame.from_records(result["models"])
        return Response(
            content=table.to_csv(index=False, lineterminator="\n"),
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="{experiment_id}-results.csv"'
            },
        )
    response.headers["Content-Disposition"] = (
        f'attachment; filename="{experiment_id}-results.json"'
    )
    return result


@router.get(
    "/{experiment_id}/predictions",
    response_model=list[PredictionResponse],
)
def get_experiment_predictions(
    experiment_id: str,
    response: Response,
    format: DownloadFormat = Query(default="json"),
    storage: LocalStorage = Depends(get_storage),
) -> list[dict] | Response:
    _require_completed(storage, experiment_id)
    report_path = storage.get_experiment_output(experiment_id, "report.json")
    report = json.loads(report_path.read_text(encoding="utf-8"))
    if format == "csv":
        csv_path = storage.get_experiment_output(experiment_id, "predictions.csv")
        return Response(
            content=csv_path.read_text(encoding="utf-8"),
            media_type="text/csv",
            headers={
                "Content-Disposition": (
                    f'attachment; filename="{experiment_id}-predictions.csv"'
                )
            },
        )
    response.headers["Content-Disposition"] = (
        f'attachment; filename="{experiment_id}-predictions.json"'
    )
    return report["predictions"]


@router.get("/{experiment_id}/report", response_model=dict[str, object])
def get_experiment_report(
    experiment_id: str,
    response: Response,
    format: DownloadFormat = Query(default="json"),
    storage: LocalStorage = Depends(get_storage),
) -> dict | Response:
    _require_completed(storage, experiment_id)
    report_path = storage.get_experiment_output(experiment_id, "report.json")
    report = json.loads(report_path.read_text(encoding="utf-8"))
    if format == "csv":
        rows = []
        for model in report["benchmark"]["models"]:
            rows.append(
                {
                    "model": model["name"],
                    "r2": model["metrics"]["r2"],
                    "rmse": model["metrics"]["rmse"],
                    "mae": model["metrics"]["mae"],
                    "training_sample_count": model["training_sample_count"],
                    "test_sample_count": model["test_sample_count"],
                    "warnings": "; ".join(report["limitations"]),
                    "metric_limitations": "; ".join(model["limitations"]),
                }
            )
        return Response(
            content=pd.DataFrame.from_records(rows).to_csv(
                index=False,
                lineterminator="\n",
            ),
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="{experiment_id}-report.csv"'
            },
        )
    response.headers["Content-Disposition"] = (
        f'attachment; filename="{experiment_id}-report.json"'
    )
    return report
