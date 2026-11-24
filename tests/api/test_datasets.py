from __future__ import annotations

import json


def upload_dataset(client, content: bytes, filename: str = "data.csv"):
    return client.post(
        "/api/datasets/upload",
        files={"file": (filename, content, "text/csv")},
    )


def test_upload_preserves_bytes_and_sanitizes_display_filename(
    api_client, uploaded_dataset, dataset_csv
):
    dataset_id = uploaded_dataset["dataset_id"]
    path = api_client.app.state.storage.upload_path(dataset_id)

    assert path.read_bytes() == dataset_csv
    assert uploaded_dataset["original_filename"] == "data.csv"
    assert str(api_client.app.state.storage.root) not in json.dumps(uploaded_dataset)
    assert uploaded_dataset["record_count"] == 8
    traversal_upload = upload_dataset(api_client, dataset_csv, r"..\..\secret.csv")
    assert traversal_upload.status_code == 201
    assert traversal_upload.json()["original_filename"] == "secret.csv"


def test_upload_rejects_bad_extension_malformed_csv_and_oversized_content(
    api_client, dataset_csv
):
    wrong_extension = upload_dataset(api_client, dataset_csv, "data.txt")
    malformed = upload_dataset(
        api_client,
        b"compound_id,smiles,activity\ncmp-1,CCO\n",
    )
    oversized = upload_dataset(api_client, b"x" * 100_001)

    assert wrong_extension.status_code == 415
    assert malformed.status_code == 422
    assert oversized.status_code == 413
    assert api_client.get("/api/datasets").json()["datasets"] == []


def test_upload_rejects_non_utf8_csv(api_client):
    response = upload_dataset(api_client, b"\xff\xfe\x00\x00")
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_upload"


def test_dataset_listing_detail_and_invalid_ids(
    api_client, uploaded_dataset
):
    dataset_id = uploaded_dataset["dataset_id"]
    listing = api_client.get("/api/datasets")
    detail = api_client.get(f"/api/datasets/{dataset_id}")
    invalid = api_client.get("/api/datasets/../../etc/passwd")

    assert listing.status_code == 200
    assert len(listing.json()["datasets"]) == 1
    assert detail.status_code == 200
    assert detail.json()["dataset_id"] == dataset_id
    assert "path" not in detail.json()
    assert invalid.status_code == 404


def test_validation_returns_diagnostics_duplicates_and_downloads(
    api_client,
):
    csv_content = (
        "compound_id,smiles,activity,endpoint,units\n"
        "a,CCO,1,Ki,nM\n"
        "b,OCC,2,Ki,nM\n"
        "c,not-a-smiles,3,Ki,nM\n"
        "d,CCN,,Ki,nM\n"
    ).encode()
    upload = upload_dataset(api_client, csv_content).json()
    response = api_client.post(
        f"/api/datasets/{upload['dataset_id']}/validate",
        json={"selection": {"endpoint": "Ki", "units": "nM"}},
    )
    report_json = api_client.get(
        f"/api/datasets/{upload['dataset_id']}/validation-report"
    )
    report_csv = api_client.get(
        f"/api/datasets/{upload['dataset_id']}/validation-report?format=csv"
    )

    assert response.status_code == 200, response.text
    report = response.json()
    assert report["source_row_count"] == 4
    assert report["accepted_record_count"] == 2
    assert report["rejected_record_count"] == 2
    assert report["invalid_smiles_count"] == 1
    assert report["missing_value_record_count"] == 1
    assert report["duplicate_structure_group_count"] == 1
    assert report["endpoint"] == "Ki"
    assert report["units"] == "nM"
    assert report_json.status_code == report_csv.status_code == 200
    assert "source_row" in report_csv.text
    assert api_client.get(
        f"/api/datasets/{upload['dataset_id']}"
    ).json()["validation_status"] == "validated"


def test_validation_requires_dataset_columns_and_reports_bad_identifier(api_client):
    missing_columns = upload_dataset(api_client, b"id,value\n1,2\n").json()
    result = api_client.post(
        f"/api/datasets/{missing_columns['dataset_id']}/validate",
        json={},
    )
    bad_id = api_client.post(
        "/api/datasets/not-a-dataset-id/validate",
        json={},
    )

    assert result.status_code == 422
    assert "compound_id" in result.json()["error"]["message"]
    assert bad_id.status_code == 404


def test_feature_generation_uses_stage2_and_supports_csv(api_client, uploaded_dataset):
    dataset_id = uploaded_dataset["dataset_id"]
    body = {
        "selection": {"endpoint": "Ki", "units": "nM"},
        "feature_config": {
            "include_descriptors": False,
            "include_morgan": True,
            "fingerprint_n_bits": 32,
        },
    }
    response = api_client.post(
        f"/api/datasets/{dataset_id}/features",
        json=body,
    )
    csv_response = api_client.post(
        f"/api/datasets/{dataset_id}/features?format=csv",
        json=body,
    )

    assert response.status_code == 200, response.text
    result = response.json()
    assert result["feature_names"] == ["morgan_fingerprint"]
    assert result["record_count"] == 8
    assert len(result["records"][0]["morgan_fingerprint"]) == 32
    assert csv_response.status_code == 200
    assert "morgan_fingerprint" in csv_response.text
    feature_metadata = (
        api_client.app.state.storage.features_dir / f"{dataset_id}.json"
    )
    saved_settings = json.loads(feature_metadata.read_text(encoding="utf-8"))
    assert saved_settings["feature_config"]["include_morgan"] is True
    assert saved_settings["feature_config"]["fingerprint"]["n_bits"] == 32


def test_datasets_are_isolated_between_storage_roots(api_client, dataset_csv, tmp_path):
    upload = upload_dataset(api_client, dataset_csv).json()
    from backend.app.main import create_app
    from fastapi.testclient import TestClient

    isolated_app = create_app(
        storage_dir=tmp_path / "other-storage",
        max_upload_bytes=100_000,
    )
    with TestClient(isolated_app) as other_client:
        assert other_client.get(f"/api/datasets/{upload['dataset_id']}").status_code == 404
