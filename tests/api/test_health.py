from __future__ import annotations


def test_health_and_version_endpoints(api_client):
    health = api_client.get("/api/health")
    version = api_client.get("/api/version")

    assert health.status_code == 200
    assert health.json()["status"] == "ok"
    assert health.json()["application_version"]
    assert version.status_code == 200
    assert {
        "application_version",
        "python_version",
        "rdkit_version",
        "numpy_version",
        "scikit_learn_version",
    } <= version.json().keys()
