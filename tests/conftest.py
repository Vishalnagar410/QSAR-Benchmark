from __future__ import annotations

import csv
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parents[1] / "src"))


@pytest.fixture
def write_csv(tmp_path: Path):
    def write(rows: list[dict[str, str]], fieldnames: list[str] | None = None) -> Path:
        destination = tmp_path / "input.csv"
        headers = fieldnames or list(rows[0])
        with destination.open("w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=headers)
            writer.writeheader()
            writer.writerows(rows)
        return destination

    return write


@pytest.fixture
def valid_rows() -> list[dict[str, str]]:
    return [
        {
            "compound_id": "cmp-1",
            "smiles": "CCO",
            "activity": "12.5",
            "endpoint": "Ki",
            "units": "nM",
            "assay_id": "assay-1",
        },
        {
            "compound_id": "cmp-2",
            "smiles": "CCN",
            "activity": "20",
            "endpoint": "Ki",
            "units": "nM",
            "assay_id": "assay-1",
        },
        {
            "compound_id": "cmp-3",
            "smiles": "c1ccccc1",
            "activity": "8",
            "endpoint": "Ki",
            "units": "nM",
            "assay_id": "assay-1",
        },
    ]

