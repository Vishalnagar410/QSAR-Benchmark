"""Dataset upload, validation, audit, and feature-generation services."""

from __future__ import annotations

import csv
import io
import unicodedata
from pathlib import PurePosixPath
from typing import Any

import pandas as pd

from backend.app.core.exceptions import UploadValidationError
from backend.app.core.storage import LocalStorage
from backend.app.schemas.api import FeatureConfigurationRequest
from qsar_benchmark.config import (
    ColumnMapping,
    DatasetSelection,
    FeatureConfig,
)
from qsar_benchmark.data import DatasetResult, load_dataset
from qsar_benchmark.molecular_features import DESCRIPTOR_NAMES


def display_filename(filename: str | None) -> str:
    submitted = (filename or "").replace("\\", "/")
    candidate = PurePosixPath(submitted).name
    cleaned = "".join(
        character
        for character in candidate
        if unicodedata.category(character)[0] != "C"
    ).strip()
    if not cleaned or cleaned in {".", ".."}:
        return "upload.csv"
    return cleaned[:255]


def inspect_csv_content(content: bytes) -> int:
    try:
        decoded = content.decode("utf-8-sig")
    except UnicodeDecodeError as error:
        raise UploadValidationError("CSV content must be valid UTF-8.") from error
    if "\x00" in decoded:
        raise UploadValidationError("CSV content contains invalid null bytes.")
    try:
        reader = csv.reader(io.StringIO(decoded, newline=""), strict=True)
        headers = next(reader, None)
        if not headers or any(not value.strip() for value in headers):
            raise UploadValidationError("CSV must contain a non-empty header row.")
        if len(set(headers)) != len(headers):
            raise UploadValidationError("CSV header contains duplicate column names.")
        record_count = 0
        for row in reader:
            if len(row) != len(headers):
                raise UploadValidationError(
                    f"Malformed CSV record at data row {record_count + 1}."
                )
            record_count += 1
    except csv.Error as error:
        raise UploadValidationError(f"Malformed CSV content: {error}") from error
    if record_count == 0:
        raise UploadValidationError("CSV must contain at least one data row.")
    return record_count


def load_validated_data(
    storage: LocalStorage,
    dataset_id: str,
    *,
    selection: DatasetSelection,
    columns: ColumnMapping,
    feature_config: FeatureConfig,
) -> DatasetResult:
    uploaded_path = storage.upload_path(dataset_id)
    return load_dataset(
        uploaded_path,
        columns=columns,
        selection=selection,
        feature_config=feature_config,
    )


def _validation_report(result: DatasetResult) -> dict[str, Any]:
    invalid_smiles = [
        row
        for row in result.audit
        if any("invalid SMILES" in reason for reason in row.exclusion_reasons)
    ]
    missing_value_rows = [
        row
        for row in result.audit
        if any(reason.startswith("missing ") for reason in row.exclusion_reasons)
    ]
    return {
        "source_row_count": result.source_row_count,
        "accepted_record_count": len(result.records),
        "rejected_record_count": len(result.exclusions),
        "invalid_smiles_count": len(invalid_smiles),
        "missing_value_record_count": len(missing_value_rows),
        "duplicate_structure_group_count": len(result.duplicate_groups),
        "endpoint": result.selection.endpoint,
        "units": result.selection.units,
        "assay_id": result.selection.assay_id,
        "diagnostics": [
            {
                "source_row": row.source_row,
                "included": row.included,
                "compound_id": row.compound_id,
                "canonical_smiles": row.canonical_smiles,
                "exclusion_reasons": list(row.exclusion_reasons),
            }
            for row in result.audit
        ],
        "duplicate_structures": [
            {
                "canonical_smiles": group.canonical_smiles,
                "source_rows": list(group.source_rows),
                "compound_ids": list(group.compound_ids),
                "included_source_rows": list(group.included_source_rows),
            }
            for group in result.duplicate_groups
        ],
    }


def validate_dataset(
    storage: LocalStorage,
    dataset_id: str,
    *,
    selection: DatasetSelection,
    columns: ColumnMapping,
) -> tuple[DatasetResult, dict[str, Any]]:
    result = load_validated_data(
        storage,
        dataset_id,
        selection=selection,
        columns=columns,
        feature_config=FeatureConfig(),
    )
    report = _validation_report(result)
    report["dataset_id"] = dataset_id
    report["validation_status"] = (
        "validated" if result.records else "invalid"
    )
    storage.save_validation_report(dataset_id, report)
    storage.update_dataset(
        dataset_id,
        {
            "validation_status": report["validation_status"],
            "endpoint": result.selection.endpoint,
            "units": result.selection.units,
            "accepted_record_count": len(result.records),
            "rejected_record_count": len(result.exclusions),
        },
    )
    return result, report


def generate_features(
    storage: LocalStorage,
    dataset_id: str,
    *,
    selection: DatasetSelection,
    columns,
    feature_config: FeatureConfigurationRequest,
) -> dict[str, Any]:
    result = load_validated_data(
        storage,
        dataset_id,
        selection=selection,
        columns=columns,
        feature_config=feature_config.to_domain(),
    )
    if not result.records:
        raise ValueError("No accepted records are available for feature generation.")

    feature_rows: list[dict[str, Any]] = []
    for record in result.records:
        row: dict[str, Any] = {
            "compound_id": record.compound_id,
            "source_row": record.source_row,
            "smiles": record.smiles,
            "canonical_smiles": record.features.canonical_smiles,
            "endpoint": record.endpoint,
            "units": record.units,
        }
        row.update(record.features.descriptors)
        if record.features.morgan_fingerprint is not None:
            row["morgan_fingerprint"] = list(record.features.morgan_fingerprint)
        feature_rows.append(row)

    dataframe = pd.DataFrame.from_records(feature_rows)
    storage.save_feature_table(
        dataset_id,
        dataframe.to_csv(index=False, lineterminator="\n"),
        {
            "dataset_id": dataset_id,
            "endpoint": result.selection.endpoint,
            "units": result.selection.units,
            "assay_id": result.selection.assay_id,
            "feature_config": feature_config.as_dict(),
            "feature_names": [
                *(
                    DESCRIPTOR_NAMES
                    if result.feature_config.include_descriptors
                    else ()
                ),
                *(
                    ("morgan_fingerprint",)
                    if result.feature_config.include_morgan
                    else ()
                ),
            ],
            "record_count": len(feature_rows),
        },
    )
    feature_names = [
        *(
            DESCRIPTOR_NAMES
            if result.feature_config.include_descriptors
            else ()
        ),
        *(
            ("morgan_fingerprint",)
            if result.feature_config.include_morgan
            else ()
        ),
    ]
    return {
        "dataset_id": dataset_id,
        "endpoint": result.selection.endpoint,
        "units": result.selection.units,
        "feature_config": feature_config.as_dict(),
        "feature_names": list(feature_names),
        "record_count": len(feature_rows),
        "records": dataframe.to_dict(orient="records"),
    }
