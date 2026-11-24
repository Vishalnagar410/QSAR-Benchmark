from __future__ import annotations

import csv
import io
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from backend.app.main import create_app


@pytest.fixture
def api_client(tmp_path) -> Iterator[TestClient]:
    app = create_app(storage_dir=tmp_path / "storage", max_upload_bytes=100_000)
    with TestClient(app) as client:
        yield client


@pytest.fixture
def dataset_csv() -> bytes:
    rows = [
        ("cmp-1", "CCO", "1.0", "Ki", "nM"),
        ("cmp-2", "CCC", "2.0", "Ki", "nM"),
        ("cmp-3", "CCN", "3.0", "Ki", "nM"),
        ("cmp-4", "c1ccccc1", "4.0", "Ki", "nM"),
        ("cmp-5", "c1ccncc1", "5.0", "Ki", "nM"),
        ("cmp-6", "C1CCCCC1", "6.0", "Ki", "nM"),
        ("cmp-7", "C1CCNCC1", "7.0", "Ki", "nM"),
        ("cmp-8", "C1COCC1", "8.0", "Ki", "nM"),
    ]
    output = io.StringIO(newline="")
    writer = csv.writer(output, lineterminator="\n")
    writer.writerow(("compound_id", "smiles", "activity", "endpoint", "units"))
    writer.writerows(rows)
    return output.getvalue().encode("utf-8")


def upload_dataset(client: TestClient, content: bytes, filename: str = "data.csv"):
    return client.post(
        "/api/datasets/upload",
        files={"file": (filename, content, "text/csv")},
    )


@pytest.fixture
def uploaded_dataset(api_client, dataset_csv) -> dict:
    response = upload_dataset(api_client, dataset_csv)
    assert response.status_code == 201, response.text
    return response.json()
