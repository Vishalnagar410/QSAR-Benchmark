from __future__ import annotations

import csv
import json

from rdkit import rdBase

from qsar_benchmark.data import load_dataset
from qsar_benchmark.reporting import write_audit_reports


def test_audit_reports_preserve_exclusions_and_duplicate_source_rows(
    tmp_path, write_csv, valid_rows
):
    rows = [dict(valid_rows[0]), dict(valid_rows[1]), dict(valid_rows[2])]
    rows[1]["smiles"] = "OCC"
    rows[2]["activity"] = "<5"
    dataset = load_dataset(write_csv(rows))
    output = tmp_path / "reports"
    write_audit_reports(dataset, output)

    with (output / "record_audit.csv").open(encoding="utf-8", newline="") as handle:
        audit_rows = list(csv.DictReader(handle))
    assert [row["source_row"] for row in audit_rows] == ["1", "2", "3"]
    assert audit_rows[2]["included"] == "false"
    assert "unsupported censored" in audit_rows[2]["exclusion_reasons"]
    assert audit_rows[0]["original_values_json"]

    with (output / "duplicate_structures.csv").open(
        encoding="utf-8", newline=""
    ) as handle:
        duplicate_rows = list(csv.DictReader(handle))
    assert len(duplicate_rows) == 1
    assert duplicate_rows[0]["source_rows"] == "1;2"

    quality = json.loads((output / "dataset_quality.json").read_text(encoding="utf-8"))
    assert quality["source_path"] == "input.csv"
    assert quality["python_version"]
    assert quality["rdkit_version"] == rdBase.rdkitVersion
    assert quality["source_row_count"] == 3
    assert quality["included_row_count"] == 2
    assert quality["excluded_row_count"] == 1
    assert quality["modeling_blocked_by_default"] is True
    assert quality["activity_values_are_user_supplied"] is True
    assert quality["activity_provenance"] == "not asserted by this validation layer"
    assert quality["molecular_features_are_calculated"] is True
