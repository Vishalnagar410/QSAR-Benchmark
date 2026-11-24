from __future__ import annotations

import json

import pytest

from qsar_benchmark.config import DatasetSelection, FeatureConfig, FingerprintConfig
from qsar_benchmark.data import load_dataset
from qsar_benchmark.pipelines import (
    prepare_modeling_dataset,
    run_benchmark,
    write_benchmark_results,
)

SMILES = ("CCO", "c1ccccc1", "C1CCCCC1", "c1ccncc1", "CCN", "C1CCNCC1")


def _validated_dataset(write_csv, smiles=SMILES, feature_config=FeatureConfig()):
    rows = [
        {
            "compound_id": f"compound-{index}",
            "smiles": structure,
            "activity": str(index * index + 1),
            "endpoint": "Ki",
            "units": "nM",
        }
        for index, structure in enumerate(smiles)
    ]
    return load_dataset(write_csv(rows), feature_config=feature_config)


def test_prepare_dataset_preserves_accepted_record_identity_and_features(write_csv):
    validated = _validated_dataset(
        write_csv,
        feature_config=FeatureConfig(
            include_descriptors=False,
            include_morgan=True,
            fingerprint=FingerprintConfig(n_bits=32),
        ),
    )
    dataset = prepare_modeling_dataset(validated, endpoint="Ki", units="nM")

    assert dataset.compound_ids == tuple(f"compound-{i}" for i in range(len(SMILES)))
    assert dataset.source_rows == tuple(range(1, len(SMILES) + 1))
    assert dataset.features.shape == (len(SMILES), 32)
    assert dataset.targets.tolist() == [1, 2, 5, 10, 17, 26]
    assert not dataset.features.flags.writeable
    assert not dataset.targets.flags.writeable


def test_prepare_requires_explicit_endpoint_and_units(write_csv):
    validated = _validated_dataset(write_csv)
    with pytest.raises(ValueError, match="endpoint must be explicitly selected"):
        prepare_modeling_dataset(validated, endpoint="", units="nM")
    with pytest.raises(ValueError, match="units must be explicitly selected"):
        prepare_modeling_dataset(validated, endpoint="Ki", units="")


def test_empty_accepted_dataset_is_rejected_without_dropping_records(write_csv):
    validated = load_dataset(
        write_csv(
            [
                {
                    "compound_id": "bad",
                    "smiles": "CCO",
                    "activity": "<5",
                    "endpoint": "Ki",
                    "units": "nM",
                }
            ]
        ),
        selection=DatasetSelection(endpoint="Ki", units="nM"),
    )
    with pytest.raises(ValueError, match="No accepted records"):
        prepare_modeling_dataset(validated, endpoint="Ki", units="nM")


def test_run_results_are_reproducible_and_machine_readable(write_csv, tmp_path):
    validated = _validated_dataset(write_csv)
    dataset = prepare_modeling_dataset(validated, endpoint="Ki", units="nM")
    first = run_benchmark(dataset, test_fraction=0.34, random_seed=31)
    second = run_benchmark(dataset, test_fraction=0.34, random_seed=31)

    assert first.to_dict() == second.to_dict()
    assert first.run_id == second.run_id
    assert first.record_count == len(SMILES)
    assert first.versions["scikit_learn"]
    model_partitions = [
        (result.train_source_rows, result.test_source_rows)
        for result in first.model_results
    ]
    assert model_partitions.count(model_partitions[0]) == len(first.model_results)

    scaffold_run = run_benchmark(
        dataset,
        split_strategy="scaffold",
        test_fraction=0.34,
        random_seed=31,
    )
    assert scaffold_run.split_strategy == "scaffold"
    assert (
        scaffold_run.split_details["training_scaffold_group_count"]
        + scaffold_run.split_details["test_scaffold_group_count"]
        == scaffold_run.split_details["scaffold_group_count"]
    )
    scaffold_partitions = [
        (result.train_source_rows, result.test_source_rows)
        for result in scaffold_run.model_results
    ]
    assert scaffold_partitions.count(scaffold_partitions[0]) == len(
        scaffold_run.model_results
    )

    output = tmp_path / "results.json"
    write_benchmark_results(first, output)
    parsed = json.loads(output.read_text(encoding="utf-8"))
    assert parsed == first.to_dict()
    assert parsed["dataset"]["endpoint"] == "Ki"
    assert len(parsed["models"]) == 3
