"""Machine-readable quality, exclusion, and duplicate-structure reports."""

from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

from rdkit import rdBase

from qsar_benchmark.data import DatasetResult
from qsar_benchmark.molecular_features import DESCRIPTOR_NAMES


def write_audit_reports(result: DatasetResult, output_directory: str | Path) -> None:
    """Write record-level inclusion/exclusion, duplicate, and quality reports."""
    output = Path(output_directory)
    output.mkdir(parents=True, exist_ok=True)

    with (output / "record_audit.csv").open(
        "w", encoding="utf-8", newline=""
    ) as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=(
                "source_row",
                "included",
                "exclusion_reasons",
                "compound_id",
                "canonical_smiles",
                "original_values_json",
            ),
        )
        writer.writeheader()
        for row in result.audit:
            writer.writerow(
                {
                    "source_row": row.source_row,
                    "included": str(row.included).lower(),
                    "exclusion_reasons": "; ".join(row.exclusion_reasons),
                    "compound_id": row.compound_id or "",
                    "canonical_smiles": row.canonical_smiles or "",
                    "original_values_json": json.dumps(
                        row.original_values,
                        ensure_ascii=True,
                        sort_keys=True,
                    ),
                }
            )

    with (output / "duplicate_structures.csv").open(
        "w", encoding="utf-8", newline=""
    ) as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=("canonical_smiles", "source_rows", "compound_ids"),
        )
        writer.writeheader()
        for group in result.duplicate_groups:
            writer.writerow(
                {
                    "canonical_smiles": group.canonical_smiles,
                    "source_rows": ";".join(map(str, group.source_rows)),
                    "compound_ids": ";".join(
                        identifier or "" for identifier in group.compound_ids
                    ),
                }
            )

    quality_report = {
        "source_path": result.source_path,
        "python_version": sys.version.split()[0],
        "rdkit_version": rdBase.rdkitVersion,
        "source_row_count": result.source_row_count,
        "included_row_count": len(result.records),
        "excluded_row_count": len(result.exclusions),
        "duplicate_structure_group_count": len(result.duplicate_groups),
        "modeling_blocked_by_default": any(
            len(group.included_source_rows) > 1 for group in result.duplicate_groups
        ),
        "endpoint": result.selection.endpoint,
        "units": result.selection.units,
        "assay_id": result.selection.assay_id,
        "feature_config": {
            "include_descriptors": result.feature_config.include_descriptors,
            "include_morgan": result.feature_config.include_morgan,
            "fingerprint": {
                "radius": result.feature_config.fingerprint.radius,
                "n_bits": result.feature_config.fingerprint.n_bits,
                "include_chirality": result.feature_config.fingerprint.include_chirality,
            },
        },
        "descriptor_names": (
            list(DESCRIPTOR_NAMES)
            if result.feature_config.include_descriptors
            else []
        ),
        "activity_values_are_user_supplied": True,
        "activity_provenance": "not asserted by this validation layer",
        "molecular_features_are_calculated": True,
    }
    (output / "dataset_quality.json").write_text(
        json.dumps(quality_report, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
