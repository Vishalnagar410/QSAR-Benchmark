"""CSV ingestion, row-level validation, and duplicate-structure auditing."""

from __future__ import annotations

import csv
import math
import re
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Mapping, Protocol

from qsar_benchmark.config import ColumnMapping, DatasetSelection, FeatureConfig
from qsar_benchmark.molecular_features import (
    InvalidSmilesError,
    MolecularFeatures,
    calculate_molecular_features,
    canonicalize_smiles,
)

_QUALIFIER_PREFIX = re.compile(r"^\s*(?:<=|>=|≤|≥|<|>|~|≈)")


@dataclass(frozen=True)
class RecordAudit:
    source_row: int
    original_values: Mapping[str, str | None]
    included: bool
    exclusion_reasons: tuple[str, ...]
    compound_id: str | None
    canonical_smiles: str | None


@dataclass(frozen=True)
class ValidatedRecord:
    source_row: int
    original_values: Mapping[str, str | None]
    compound_id: str
    smiles: str
    activity: float
    endpoint: str | None
    units: str | None
    assay_id: str | None
    features: MolecularFeatures


@dataclass(frozen=True)
class DuplicateGroup:
    canonical_smiles: str
    source_rows: tuple[int, ...]
    compound_ids: tuple[str | None, ...]
    included_source_rows: tuple[int, ...]


class DatasetValidationError(ValueError):
    """Raised when a CSV cannot be interpreted as the requested dataset."""


class DuplicateStructureError(ValueError):
    """Raised when the default policy blocks duplicate structures for modeling."""

    def __init__(self, duplicate_groups: tuple[DuplicateGroup, ...]) -> None:
        self.duplicate_groups = duplicate_groups
        rows = [row for group in duplicate_groups for row in group.source_rows]
        super().__init__(
            "Duplicate canonical structures block modeling under the default "
            f"replicate policy; affected source rows: {', '.join(map(str, rows))}."
        )


class ReplicatePolicy(Protocol):
    """Interface for future replicate handling; aggregation is not implemented."""

    def validate(self, duplicate_groups: tuple[DuplicateGroup, ...]) -> None: ...


class RejectDuplicateStructures:
    """Default replicate policy: refuse modeling when structures are duplicated."""

    def validate(self, duplicate_groups: tuple[DuplicateGroup, ...]) -> None:
        modelling_duplicates = tuple(
            group for group in duplicate_groups if len(group.included_source_rows) > 1
        )
        if modelling_duplicates:
            raise DuplicateStructureError(modelling_duplicates)


@dataclass(frozen=True)
class DatasetResult:
    source_path: str
    source_row_count: int
    records: tuple[ValidatedRecord, ...]
    audit: tuple[RecordAudit, ...]
    duplicate_groups: tuple[DuplicateGroup, ...]
    selection: DatasetSelection
    feature_config: FeatureConfig

    @property
    def exclusions(self) -> tuple[RecordAudit, ...]:
        return tuple(row for row in self.audit if not row.included)

    def assert_modeling_ready(
        self,
        replicate_policy: ReplicatePolicy | None = None,
    ) -> None:
        """Apply the default duplicate rejection or an explicit future policy."""
        policy = (
            RejectDuplicateStructures()
            if replicate_policy is None
            else replicate_policy
        )
        policy.validate(self.duplicate_groups)


def _column_value(row: Mapping[str, str | None], name: str | None) -> str | None:
    if name is None:
        return None
    value = row.get(name)
    return value.strip() if value is not None and value.strip() else None


def _resolve_metadata(
    rows: list[dict[str, str | None]],
    column_name: str | None,
    selected_value: str | None,
    label: str,
) -> tuple[str | None, tuple[str | None, ...]]:
    observed = tuple(
        sorted(
            {
                value
                for row in rows
                if (value := _column_value(row, column_name)) is not None
            }
        )
    )
    if selected_value is not None:
        if observed and selected_value not in observed:
            raise DatasetValidationError(
                f"Selected {label} {selected_value!r} is absent from the input; "
                f"observed values: {', '.join(observed)}."
            )
        return selected_value, observed
    if len(observed) > 1:
        raise DatasetValidationError(
            f"Input contains multiple {label} values; explicitly select one: "
            f"{', '.join(observed)}."
        )
    return (observed[0] if observed else None), observed


def _parse_activity(value: str | None) -> tuple[float | None, str | None]:
    if value is None or not value.strip():
        return None, "missing activity value"
    if _QUALIFIER_PREFIX.match(value):
        return None, "unsupported censored or qualifier-prefixed activity value"
    try:
        activity = float(value)
    except ValueError:
        return None, "activity value is not numeric"
    if not math.isfinite(activity):
        return None, "activity value is not finite"
    return activity, None


def _read_csv(
    path: Path,
    columns: ColumnMapping,
) -> tuple[list[str], list[dict[str, str | None]]]:
    try:
        with path.open("r", encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle, strict=True)
            if reader.fieldnames is None:
                raise DatasetValidationError("CSV input has no header row.")
            fieldnames = reader.fieldnames
            if any(name is None or not name.strip() for name in fieldnames):
                raise DatasetValidationError("CSV header contains an empty column name.")
            if len(set(fieldnames)) != len(fieldnames):
                raise DatasetValidationError("CSV header contains duplicate column names.")
            required = (columns.compound_id, columns.smiles, columns.activity)
            missing = [name for name in required if name not in fieldnames]
            if missing:
                raise DatasetValidationError(
                    "CSV is missing required columns: " + ", ".join(missing)
                )
            rows: list[dict[str, str | None]] = []
            for row in reader:
                if None in row:
                    extra_values = row.pop(None)
                    for index, value in enumerate(extra_values, start=1):
                        row[f"__extra_value_{index}"] = value
                rows.append(dict(row))
            return list(fieldnames), rows
    except (OSError, UnicodeError, csv.Error) as error:
        raise DatasetValidationError(f"Could not read CSV {path}: {error}") from error


def load_dataset(
    path: str | Path,
    columns: ColumnMapping = ColumnMapping(),
    selection: DatasetSelection = DatasetSelection(),
    feature_config: FeatureConfig = FeatureConfig(),
) -> DatasetResult:
    """Load, validate, and featurize records without dropping audit information."""
    source_path = Path(path)
    _, raw_rows = _read_csv(source_path, columns)
    if not raw_rows:
        raise DatasetValidationError("CSV contains no data rows.")

    resolved_metadata: dict[str, str | None] = {}
    for label, column_name, selected_value in (
        ("endpoint", columns.endpoint, selection.endpoint),
        ("units", columns.units, selection.units),
        ("assay identifier", columns.assay_id, selection.assay_id),
    ):
        resolved, observed = _resolve_metadata(
            raw_rows,
            column_name,
            selected_value,
            label,
        )
        resolved_metadata[label] = resolved
    for required_metadata in ("endpoint", "units"):
        if resolved_metadata[required_metadata] is None:
            raise DatasetValidationError(
                f"Specify {required_metadata} in the CSV or select it explicitly."
            )

    identifiers: dict[str, list[int]] = defaultdict(list)
    for source_row, row in enumerate(raw_rows, start=1):
        identifier = _column_value(row, columns.compound_id)
        if identifier is not None:
            identifiers[identifier].append(source_row)
    duplicate_identifier_rows = {
        row_number
        for row_numbers in identifiers.values()
        if len(row_numbers) > 1
        for row_number in row_numbers
    }

    audits: list[RecordAudit] = []
    records: list[ValidatedRecord] = []
    structure_rows: dict[str, list[tuple[int, str, bool]]] = defaultdict(list)
    for source_row, row in enumerate(raw_rows, start=1):
        original_values = dict(row)
        reasons: list[str] = []
        compound_id = _column_value(row, columns.compound_id)
        smiles_value = _column_value(row, columns.smiles)
        endpoint = _column_value(row, columns.endpoint)
        if endpoint is None and (
            columns.endpoint is None or columns.endpoint not in row
        ):
            endpoint = selection.endpoint
        units = _column_value(row, columns.units)
        if units is None and (columns.units is None or columns.units not in row):
            units = selection.units
        assay_id = _column_value(row, columns.assay_id)
        if assay_id is None and (
            columns.assay_id is None or columns.assay_id not in row
        ):
            assay_id = selection.assay_id

        if compound_id is None:
            reasons.append("missing compound identifier")
        if source_row in duplicate_identifier_rows:
            reasons.append("duplicate compound identifier")
        if smiles_value is None:
            reasons.append("missing SMILES")
        activity, activity_error = _parse_activity(row.get(columns.activity))
        if activity_error:
            reasons.append(activity_error)

        for label, column_name, selected_value, observed_value in (
            ("endpoint", columns.endpoint, selection.endpoint, endpoint),
            ("units", columns.units, selection.units, units),
            ("assay identifier", columns.assay_id, selection.assay_id, assay_id),
        ):
            if column_name is not None and column_name in row and observed_value is None:
                reasons.append(f"missing {label} metadata")
            elif selected_value is not None and observed_value != selected_value:
                reasons.append(f"{label} does not match the selected value")

        canonical_smiles: str | None = None
        features: MolecularFeatures | None = None
        if smiles_value is not None:
            try:
                _, canonical_smiles = canonicalize_smiles(smiles_value)
            except InvalidSmilesError as error:
                reasons.append(f"invalid SMILES: {error}")
        if not reasons and canonical_smiles is not None:
            try:
                features = calculate_molecular_features(smiles_value, feature_config)
                canonical_smiles = features.canonical_smiles
            except ValueError as error:
                reasons.append(f"molecular feature calculation failed: {error}")

        included = not reasons and features is not None and activity is not None
        audits.append(
            RecordAudit(
                source_row=source_row,
                original_values=original_values,
                included=included,
                exclusion_reasons=tuple(reasons),
                compound_id=compound_id,
                canonical_smiles=canonical_smiles,
            )
        )
        if canonical_smiles is not None:
            structure_rows[canonical_smiles].append(
                (source_row, compound_id or "", included)
            )
        if (
            included
            and compound_id is not None
            and smiles_value is not None
            and activity is not None
            and features is not None
        ):
            record = ValidatedRecord(
                source_row=source_row,
                original_values=original_values,
                compound_id=compound_id,
                smiles=smiles_value,
                activity=activity,
                endpoint=endpoint,
                units=units,
                assay_id=assay_id,
                features=features,
            )
            records.append(record)

    duplicate_groups = tuple(
        DuplicateGroup(
            canonical_smiles=canonical,
            source_rows=tuple(row for row, _, _ in occurrences),
            compound_ids=tuple(identifier or None for _, identifier, _ in occurrences),
            included_source_rows=tuple(
                row for row, _, included in occurrences if included
            ),
        )
        for canonical, occurrences in sorted(structure_rows.items())
        if len(occurrences) > 1
    )
    return DatasetResult(
        source_path=source_path.name,
        source_row_count=len(raw_rows),
        records=tuple(records),
        audit=tuple(audits),
        duplicate_groups=duplicate_groups,
        selection=DatasetSelection(
            endpoint=resolved_metadata["endpoint"],
            units=resolved_metadata["units"],
            assay_id=resolved_metadata["assay identifier"],
        ),
        feature_config=feature_config,
    )
