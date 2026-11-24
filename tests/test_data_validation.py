from __future__ import annotations

import math

import pytest

from qsar_benchmark.config import ColumnMapping, DatasetSelection
from qsar_benchmark.data import (
    DatasetValidationError,
    DuplicateStructureError,
    load_dataset,
)


def test_required_columns_are_enforced(write_csv):
    path = write_csv([{"compound_id": "a", "smiles": "CCO"}])
    with pytest.raises(DatasetValidationError, match="activity"):
        load_dataset(path, columns=ColumnMapping(endpoint=None, units=None))


def test_missing_endpoint_and_units_require_explicit_selection(write_csv):
    path = write_csv([{"compound_id": "a", "smiles": "CCO", "activity": "1"}])
    with pytest.raises(DatasetValidationError, match="endpoint"):
        load_dataset(path, columns=ColumnMapping(endpoint=None, units=None))

    result = load_dataset(
        path,
        columns=ColumnMapping(endpoint=None, units=None),
        selection=DatasetSelection(endpoint="Ki", units="nM"),
    )
    assert result.records[0].endpoint == "Ki"
    assert result.records[0].units == "nM"


def test_selected_endpoint_and_units_fill_absent_optional_columns(write_csv):
    path = write_csv(
        [{"compound_id": "a", "smiles": "CCO", "activity": "1"}]
    )
    result = load_dataset(
        path,
        selection=DatasetSelection(endpoint="Ki", units="nM"),
    )
    assert result.records[0].endpoint == "Ki"
    assert result.records[0].units == "nM"


@pytest.mark.parametrize(
    ("field", "value", "expected_reason"),
    [
        ("compound_id", "", "missing compound identifier"),
        ("smiles", "", "missing SMILES"),
        ("activity", "", "missing activity value"),
        ("activity", "not-a-number", "activity value is not numeric"),
        ("activity", "nan", "activity value is not finite"),
        ("activity", "inf", "activity value is not finite"),
        ("activity", "<10", "unsupported censored or qualifier-prefixed"),
        ("smiles", "not a smiles", "invalid SMILES"),
    ],
)
def test_invalid_values_are_excluded_with_reasons(
    write_csv, valid_rows, field, value, expected_reason
):
    rows = [dict(valid_rows[0])]
    rows[0][field] = value
    result = load_dataset(write_csv(rows))
    assert result.records == ()
    assert any(
        expected_reason in reason
        for reason in result.exclusions[0].exclusion_reasons
    )


def test_duplicate_identifiers_exclude_all_affected_rows(write_csv, valid_rows):
    rows = [dict(valid_rows[0]), dict(valid_rows[1])]
    rows[1]["compound_id"] = rows[0]["compound_id"]
    result = load_dataset(write_csv(rows))
    assert [row.included for row in result.audit] == [False, False]
    assert all(
        "duplicate compound identifier" in row.exclusion_reasons
        for row in result.audit
    )
    assert result.audit[0].source_row == 1
    assert result.audit[1].source_row == 2


@pytest.mark.parametrize(
    ("column", "selection_value", "message"),
    [
        ("endpoint", None, "multiple endpoint values"),
        ("units", None, "multiple units values"),
        ("assay_id", None, "multiple assay identifier values"),
    ],
)
def test_mixed_metadata_requires_explicit_selection(
    write_csv, valid_rows, column, selection_value, message
):
    rows = [dict(valid_rows[0]), dict(valid_rows[1])]
    rows[1][column] = "different"
    with pytest.raises(DatasetValidationError, match=message):
        load_dataset(write_csv(rows))

    selection = DatasetSelection(
        endpoint="Ki",
        units="nM",
        assay_id="assay-1",
    )
    result = load_dataset(write_csv(rows), selection=selection)
    assert len(result.records) == 1
    assert result.exclusions[0].source_row == 2
    assert result.exclusions[0].exclusion_reasons == (
        f"{'assay identifier' if column == 'assay_id' else column} "
        "does not match the selected value",
    )


def test_canonical_duplicate_structures_are_reported_and_block_modeling(
    write_csv, valid_rows
):
    rows = [dict(valid_rows[0]), dict(valid_rows[1])]
    rows[1]["smiles"] = "OCC"
    result = load_dataset(write_csv(rows))

    assert len(result.records) == 2
    assert len(result.duplicate_groups) == 1
    group = result.duplicate_groups[0]
    assert group.source_rows == (1, 2)
    assert group.compound_ids == ("cmp-1", "cmp-2")
    with pytest.raises(DuplicateStructureError, match="source rows: 1, 2"):
        result.assert_modeling_ready()


def test_invalid_activity_duplicate_is_reported_but_does_not_block_modeling(
    write_csv, valid_rows
):
    rows = [dict(valid_rows[0]), dict(valid_rows[1])]
    rows[1]["smiles"] = "OCC"
    rows[1]["activity"] = "not numeric"
    result = load_dataset(write_csv(rows))
    assert len(result.duplicate_groups) == 1
    assert result.duplicate_groups[0].source_rows == (1, 2)
    assert result.duplicate_groups[0].included_source_rows == (1,)
    assert len(result.exclusions) == 1
    result.assert_modeling_ready()


def test_source_rows_and_original_values_are_stable(write_csv, valid_rows):
    rows = [dict(valid_rows[0]), dict(valid_rows[1]), dict(valid_rows[2])]
    rows[1]["smiles"] = "invalid"
    result = load_dataset(write_csv(rows))
    assert [row.source_row for row in result.audit] == [1, 2, 3]
    assert [row.source_row for row in result.records] == [1, 3]
    assert result.audit[1].original_values["smiles"] == "invalid"
    assert result.audit[1].canonical_smiles is None


def test_all_valid_activity_values_are_finite(write_csv, valid_rows):
    result = load_dataset(write_csv(valid_rows))
    assert all(math.isfinite(record.activity) for record in result.records)
