from __future__ import annotations

import time


def _upload(client, content: bytes):
    return client.post(
        "/api/datasets/upload",
        files={"file": ("duplicate.csv", content, "text/csv")},
    )


def _experiment_payload(dataset_id: str) -> dict:
    return {
        "dataset_id": dataset_id,
        "endpoint": "Ki",
        "units": "nM",
        "feature_config": {"include_descriptors": True},
        "split_strategy": "random",
        "test_fraction": 0.25,
        "random_seed": 17,
        "selected_models": ["dummy_mean", "ridge"],
    }


def _wait_for_status(client, experiment_id: str, expected: str) -> dict:
    deadline = time.monotonic() + 10
    while time.monotonic() < deadline:
        response = client.get(f"/api/experiments/{experiment_id}")
        assert response.status_code == 200
        metadata = response.json()
        if metadata["status"] in {"completed", "failed"}:
            assert metadata["status"] == expected, metadata
            return metadata
        time.sleep(0.02)
    raise AssertionError("Experiment did not finish within the test timeout.")


def test_experiment_creation_validates_configuration_and_history(
    api_client, uploaded_dataset
):
    payload = _experiment_payload(uploaded_dataset["dataset_id"])
    created = api_client.post("/api/experiments", json=payload)
    invalid_split = api_client.post(
        "/api/experiments",
        json={**payload, "split_strategy": "invalid"},
    )
    invalid_dataset = api_client.post(
        "/api/experiments",
        json={**payload, "dataset_id": "../unknown"},
    )

    assert created.status_code == 201, created.text
    assert created.json()["status"] == "created"
    assert invalid_split.status_code == 422
    assert invalid_dataset.status_code == 404
    listing = api_client.get("/api/experiments")
    assert len(listing.json()["experiments"]) == 1
    detail = api_client.get(
        f"/api/experiments/{created.json()['experiment_id']}"
    )
    assert detail.status_code == 200


def test_experiment_rejects_invalid_models_endpoint_and_split(
    api_client, uploaded_dataset
):
    payload = _experiment_payload(uploaded_dataset["dataset_id"])
    invalid_model = api_client.post(
        "/api/experiments",
        json={**payload, "selected_models": ["svm"]},
    )
    duplicate_models = api_client.post(
        "/api/experiments",
        json={**payload, "selected_models": ["ridge", "ridge"]},
    )
    unit_mismatch = api_client.post(
        "/api/experiments",
        json={**payload, "units": "uM"},
    )
    invalid_fraction = api_client.post(
        "/api/experiments",
        json={**payload, "test_fraction": 1.0},
    )

    assert invalid_model.status_code == 422
    assert duplicate_models.status_code == 422
    assert unit_mismatch.status_code == 422
    assert invalid_fraction.status_code == 422


def test_scaffold_experiment_preserves_acyclic_group(api_client, uploaded_dataset):
    payload = {
        **_experiment_payload(uploaded_dataset["dataset_id"]),
        "split_strategy": "scaffold",
        "test_fraction": 0.25,
        "selected_models": ["dummy_mean"],
    }
    created = api_client.post("/api/experiments", json=payload)
    assert created.status_code == 201, created.text
    experiment_id = created.json()["experiment_id"]
    api_client.post(f"/api/experiments/{experiment_id}/run")
    _wait_for_status(api_client, experiment_id, "completed")

    result = api_client.get(f"/api/experiments/{experiment_id}/results").json()
    model = result["models"][0]
    acyclic_ids = {"cmp-1", "cmp-2", "cmp-3"}
    train_acyclic = acyclic_ids.intersection(model["train_compound_ids"])
    test_acyclic = acyclic_ids.intersection(model["test_compound_ids"])
    assert not (train_acyclic and test_acyclic)
    assert len(train_acyclic | test_acyclic) == len(acyclic_ids)
    assert (
        result["split"]["training_scaffold_group_count"]
        + result["split"]["test_scaffold_group_count"]
        == result["split"]["scaffold_group_count"]
    )


def test_experiment_rejects_duplicate_accepted_structures(api_client):
    content = (
        b"compound_id,smiles,activity,endpoint,units\n"
        b"a,CCO,1,Ki,nM\n"
        b"b,OCC,2,Ki,nM\n"
        b"c,c1ccccc1,3,Ki,nM\n"
    )
    uploaded = _upload(api_client, content).json()
    response = api_client.post(
        "/api/experiments",
        json=_experiment_payload(uploaded["dataset_id"]),
    )
    assert response.status_code == 422
    assert "Duplicate canonical structures" in response.json()["error"]["message"]


def test_experiment_execution_status_results_predictions_and_downloads(
    api_client, uploaded_dataset
):
    created = api_client.post(
        "/api/experiments",
        json=_experiment_payload(uploaded_dataset["dataset_id"]),
    )
    assert created.status_code == 201, created.text
    experiment_id = created.json()["experiment_id"]
    before_run = api_client.get(
        f"/api/experiments/{experiment_id}/results"
    )
    started = api_client.post(f"/api/experiments/{experiment_id}/run")
    metadata = _wait_for_status(api_client, experiment_id, "completed")

    assert before_run.status_code == 409
    assert started.status_code == 202
    assert started.json()["status"] in {"queued", "running", "completed"}
    assert metadata["started_at"]
    assert metadata["completed_at"]

    results = api_client.get(f"/api/experiments/{experiment_id}/results")
    results_csv = api_client.get(
        f"/api/experiments/{experiment_id}/results?format=csv"
    )
    predictions = api_client.get(
        f"/api/experiments/{experiment_id}/predictions"
    )
    predictions_csv = api_client.get(
        f"/api/experiments/{experiment_id}/predictions?format=csv"
    )
    report = api_client.get(f"/api/experiments/{experiment_id}/report")
    report_csv = api_client.get(
        f"/api/experiments/{experiment_id}/report?format=csv"
    )

    assert results.status_code == 200
    model_results = results.json()["models"]
    assert [item["name"] for item in model_results] == ["dummy_mean", "ridge"]
    assert model_results[0]["metrics"]["rmse"] >= 0
    assert model_results[0]["test_actual_values"]
    assert len(predictions.json()) == 4
    assert {"actual", "predicted", "residual"} <= predictions.json()[0].keys()
    assert results_csv.status_code == predictions_csv.status_code == report_csv.status_code == 200
    assert "name" in results_csv.text
    assert "residual" in predictions_csv.text
    assert report.status_code == 200
    assert report.json()["experiment"]["status"] == "completed"
    assert api_client.post(f"/api/experiments/{experiment_id}/run").status_code == 409
    assert api_client.get("/api/experiments/not-an-id").status_code == 404


def test_single_worker_rejects_concurrent_active_run(api_client, uploaded_dataset):
    payload = _experiment_payload(uploaded_dataset["dataset_id"])
    first = api_client.post("/api/experiments", json=payload).json()
    second = api_client.post("/api/experiments", json=payload).json()
    first_response = api_client.post(f"/api/experiments/{first['experiment_id']}/run")
    second_response = api_client.post(f"/api/experiments/{second['experiment_id']}/run")

    assert first_response.status_code == 202
    assert second_response.status_code in {202, 409}
    if second_response.status_code == 202:
        first_status = _wait_for_status(api_client, first["experiment_id"], "completed")
        second_status = _wait_for_status(api_client, second["experiment_id"], "completed")
        assert first_status["status"] == second_status["status"] == "completed"
