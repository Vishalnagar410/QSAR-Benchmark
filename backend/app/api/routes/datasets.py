"""Dataset upload, validation, feature, and download endpoints."""

from __future__ import annotations

import logging
from pathlib import PurePosixPath

import pandas as pd
from fastapi import APIRouter, Depends, File, Query, Request, Response, UploadFile
from fastapi.responses import Response

from backend.app.api.dependencies import get_storage
from backend.app.core.exceptions import (
    UploadTooLargeError,
    UnsupportedUploadTypeError,
)
from backend.app.core.storage import LocalStorage
from backend.app.schemas.api import (
    DownloadFormat,
    DatasetListResponse,
    DatasetMetadataResponse,
    DatasetValidationResponse,
    FeatureRequest,
    FeatureGenerationResponse,
    ValidationRequest,
)
from backend.app.services.datasets import (
    display_filename,
    generate_features,
    inspect_csv_content,
    validate_dataset,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/datasets", tags=["datasets"])


def _public_dataset(metadata: dict) -> dict:
    fields = (
        "dataset_id",
        "original_filename",
        "uploaded_at",
        "record_count",
        "validation_status",
        "endpoint",
        "units",
        "accepted_record_count",
        "rejected_record_count",
    )
    return {key: metadata.get(key) for key in fields}


@router.post(
    "/upload",
    status_code=201,
    response_model=DatasetMetadataResponse,
)
async def upload_dataset(
    request: Request,
    file: UploadFile = File(...),
    storage: LocalStorage = Depends(get_storage),
) -> dict:
    original_name = file.filename or ""
    safe_name = display_filename(original_name)
    if PurePosixPath(original_name.replace("\\", "/")).suffix.lower() != ".csv":
        raise UnsupportedUploadTypeError(
            "Only files with a .csv extension are accepted."
        )

    max_bytes: int = request.app.state.max_upload_bytes
    content = bytearray()
    try:
        while chunk := await file.read(min(64 * 1024, max_bytes + 1 - len(content))):
            content.extend(chunk)
            if len(content) > max_bytes:
                raise UploadTooLargeError(
                    f"Upload exceeds the configured {max_bytes}-byte limit."
                )
    finally:
        await file.close()
    record_count = inspect_csv_content(bytes(content))
    metadata = storage.save_upload(
        bytes(content),
        display_filename=safe_name,
        record_count=record_count,
    )
    logger.info("Uploaded dataset %s (%d CSV rows).", metadata["dataset_id"], record_count)
    return _public_dataset(metadata)


@router.get("", response_model=DatasetListResponse)
def list_datasets(storage: LocalStorage = Depends(get_storage)) -> dict:
    return {"datasets": [_public_dataset(item) for item in storage.list_datasets()]}


@router.get("/{dataset_id}", response_model=DatasetMetadataResponse)
def get_dataset(
    dataset_id: str,
    storage: LocalStorage = Depends(get_storage),
) -> dict:
    return _public_dataset(storage.get_dataset(dataset_id))


@router.post(
    "/{dataset_id}/validate",
    response_model=DatasetValidationResponse,
)
def validate_uploaded_dataset(
    dataset_id: str,
    body: ValidationRequest,
    storage: LocalStorage = Depends(get_storage),
) -> dict:
    try:
        _, report = validate_dataset(
            storage,
            dataset_id,
            selection=body.selection.to_domain(),
            columns=body.columns.to_domain(),
        )
    except ValueError:
        storage.update_dataset(
            dataset_id,
            {"validation_status": "invalid"},
        )
        raise
    return {"dataset_id": dataset_id, **report}


@router.get(
    "/{dataset_id}/validation-report",
    response_model=DatasetValidationResponse,
)
def download_validation_report(
    dataset_id: str,
    response: Response,
    format: DownloadFormat = Query(default="json"),
    storage: LocalStorage = Depends(get_storage),
) -> dict | Response:
    report = storage.get_validation_report(dataset_id)
    if format == "csv":
        table = pd.DataFrame.from_records(report["diagnostics"])
        return Response(
            content=table.to_csv(index=False, lineterminator="\n"),
            media_type="text/csv",
            headers={
                "Content-Disposition": (
                    f'attachment; filename="{dataset_id}-validation.csv"'
                )
            },
        )
    response.headers["Content-Disposition"] = (
        f'attachment; filename="{dataset_id}-validation.json"'
    )
    return report


@router.post(
    "/{dataset_id}/features",
    response_model=FeatureGenerationResponse,
)
def create_features(
    dataset_id: str,
    body: FeatureRequest,
    format: DownloadFormat = Query(default="json"),
    storage: LocalStorage = Depends(get_storage),
) -> dict | Response:
    feature_result = generate_features(
        storage,
        dataset_id,
        selection=body.selection.to_domain(),
        columns=body.columns.to_domain(),
        feature_config=body.feature_config,
    )
    if format == "csv":
        csv_content = storage.features_dir.joinpath(f"{dataset_id}.csv").read_text(
            encoding="utf-8"
        )
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="{dataset_id}-features.csv"'
            },
        )
    return feature_result
