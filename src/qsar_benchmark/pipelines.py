"""Validated modelling datasets and reproducible baseline benchmark runs."""

from __future__ import annotations

import hashlib
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Mapping

import numpy as np
import sklearn
from rdkit import rdBase

from qsar_benchmark.config import FeatureConfig
from qsar_benchmark.data import DatasetResult
from qsar_benchmark.evaluation import (
    EvaluationResult,
    baseline_model_configurations,
    evaluate_baselines,
)
from qsar_benchmark.molecular_features import DESCRIPTOR_NAMES
from qsar_benchmark.splitting import DataSplit, SplitStrategy, split_dataset


def _feature_config_dict(config: FeatureConfig) -> dict[str, object]:
    return {
        "include_descriptors": config.include_descriptors,
        "include_morgan": config.include_morgan,
        "fingerprint": {
            "radius": config.fingerprint.radius,
            "n_bits": config.fingerprint.n_bits,
            "include_chirality": config.fingerprint.include_chirality,
        },
    }


@dataclass(frozen=True)
class ModelingDataset:
    features: np.ndarray
    targets: np.ndarray
    compound_ids: tuple[str, ...]
    source_rows: tuple[int, ...]
    canonical_smiles: tuple[str, ...]
    endpoint: str
    units: str
    feature_config: FeatureConfig

    def __post_init__(self) -> None:
        features = np.array(self.features, dtype=np.float64, copy=True)
        targets = np.array(self.targets, dtype=np.float64, copy=True)
        count = len(self.compound_ids)
        if features.ndim != 2 or targets.ndim != 1:
            raise ValueError("Features must be 2D and targets must be 1D.")
        if features.shape[1] == 0:
            raise ValueError("At least one molecular feature is required.")
        if targets.size != count or features.shape[0] != count:
            raise ValueError("Each feature and target row must map to one compound.")
        if len(self.source_rows) != count or len(self.canonical_smiles) != count:
            raise ValueError("Compound IDs, source rows, structures, and features must align.")
        if len(set(self.compound_ids)) != count or len(set(self.source_rows)) != count:
            raise ValueError("Compound IDs and source-row references must be unique.")
        if any(not identifier for identifier in self.compound_ids):
            raise ValueError("Compound IDs must be non-empty.")
        if any(source_row < 1 for source_row in self.source_rows):
            raise ValueError("Source-row references must be positive.")
        if any(not smiles for smiles in self.canonical_smiles):
            raise ValueError("Canonical structures must be non-empty.")
        if not self.endpoint or not self.units:
            raise ValueError("Endpoint and units must be explicitly specified.")
        if not np.isfinite(features).all() or not np.isfinite(targets).all():
            raise ValueError("Modelling features and targets must be finite.")
        features.setflags(write=False)
        targets.setflags(write=False)
        object.__setattr__(self, "features", features)
        object.__setattr__(self, "targets", targets)


def prepare_modeling_dataset(
    dataset: DatasetResult,
    *,
    endpoint: str,
    units: str,
) -> ModelingDataset:
    """Build features from accepted Stage 2 records for one explicitly named assay."""
    if not endpoint or not endpoint.strip():
        raise ValueError("An endpoint must be explicitly selected for modelling.")
    if not units or not units.strip():
        raise ValueError("Activity units must be explicitly selected for modelling.")
    dataset.assert_modeling_ready()
    if dataset.selection.endpoint != endpoint:
        raise ValueError(
            f"Selected endpoint {endpoint!r} does not match validated dataset "
            f"endpoint {dataset.selection.endpoint!r}."
        )
    if dataset.selection.units != units:
        raise ValueError(
            f"Selected units {units!r} do not match validated dataset units "
            f"{dataset.selection.units!r}; unit conversion is not performed."
        )
    if not dataset.records:
        raise ValueError("No accepted records are available for modelling.")

    feature_rows: list[list[float]] = []
    for record in dataset.records:
        if record.endpoint != endpoint or record.units != units:
            raise ValueError(
                "Validated records contain incompatible endpoints or activity units."
            )
        values: list[float] = []
        if dataset.feature_config.include_descriptors:
            try:
                values.extend(
                    float(record.features.descriptors[name])
                    for name in DESCRIPTOR_NAMES
                )
            except KeyError as error:
                raise ValueError(
                    f"Validated record is missing configured descriptor {error.args[0]!r}."
                ) from error
        if dataset.feature_config.include_morgan:
            fingerprint = record.features.morgan_fingerprint
            if fingerprint is None:
                raise ValueError(
                    "Validated record is missing its configured Morgan fingerprint."
                )
            values.extend(float(bit) for bit in fingerprint)
        feature_rows.append(values)

    return ModelingDataset(
        features=np.asarray(feature_rows, dtype=np.float64),
        targets=np.asarray([record.activity for record in dataset.records], dtype=np.float64),
        compound_ids=tuple(record.compound_id for record in dataset.records),
        source_rows=tuple(record.source_row for record in dataset.records),
        canonical_smiles=tuple(
            record.features.canonical_smiles for record in dataset.records
        ),
        endpoint=endpoint,
        units=units,
        feature_config=dataset.feature_config,
    )


@dataclass(frozen=True)
class BenchmarkRun:
    run_id: str
    record_count: int
    endpoint: str
    units: str
    split_strategy: SplitStrategy
    random_seed: int
    test_fraction: float
    split_details: Mapping[str, int]
    feature_config: Mapping[str, object]
    model_results: tuple[EvaluationResult, ...]
    versions: Mapping[str, str]
    warnings: tuple[str, ...]

    def to_dict(self) -> dict[str, object]:
        return {
            "run_id": self.run_id,
            "dataset": {
                "record_count": self.record_count,
                "endpoint": self.endpoint,
                "units": self.units,
            },
            "split": {
                "strategy": self.split_strategy,
                "random_seed": self.random_seed,
                "test_fraction": self.test_fraction,
                **self.split_details,
            },
            "feature_config": dict(self.feature_config),
            "models": [
                {
                    "name": result.model_name,
                    "configuration": dict(result.model_configuration),
                    "training_sample_count": result.metrics.n_train,
                    "test_sample_count": result.metrics.n_test,
                    "train_compound_ids": list(result.train_compound_ids),
                    "test_compound_ids": list(result.test_compound_ids),
                    "train_source_rows": list(result.train_source_rows),
                    "test_source_rows": list(result.test_source_rows),
                    "test_actual_values": list(result.test_actual_values),
                    "test_predicted_values": list(result.test_predicted_values),
                    "metrics": {
                        "r2": result.metrics.r2,
                        "rmse": result.metrics.rmse,
                        "mae": result.metrics.mae,
                    },
                    "evaluation_status": result.metrics.status,
                    "limitations": list(result.metrics.limitations),
                }
                for result in self.model_results
            ],
            "versions": dict(self.versions),
            "warnings": list(self.warnings),
        }


def _run_identifier(
    dataset: ModelingDataset,
    split_strategy: SplitStrategy,
    random_seed: int,
    test_fraction: float,
    model_names: tuple[str, ...] | None,
    versions: Mapping[str, str],
) -> str:
    arrays = hashlib.sha256(
        np.ascontiguousarray(dataset.features, dtype="<f8").tobytes()
        + np.ascontiguousarray(dataset.targets, dtype="<f8").tobytes()
    ).hexdigest()
    identity = {
        "compound_ids": dataset.compound_ids,
        "source_rows": dataset.source_rows,
        "canonical_smiles": dataset.canonical_smiles,
        "endpoint": dataset.endpoint,
        "units": dataset.units,
        "array_sha256": arrays,
        "feature_config": _feature_config_dict(dataset.feature_config),
        "split_strategy": split_strategy,
        "random_seed": random_seed,
        "test_fraction": test_fraction,
        "model_names": model_names or ("dummy_mean", "ridge", "random_forest"),
        "model_configurations": baseline_model_configurations(random_seed),
        "versions": dict(versions),
    }
    encoded = json.dumps(identity, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return "qsar-" + hashlib.sha256(encoded).hexdigest()[:20]


def _split_details(split: DataSplit) -> dict[str, int]:
    return {
        "training_sample_count": split.train_size,
        "test_sample_count": split.test_size,
        "scaffold_group_count": split.scaffold_group_count,
        "training_scaffold_group_count": split.train_scaffold_group_count,
        "test_scaffold_group_count": split.test_scaffold_group_count,
    }


def run_benchmark(
    dataset: ModelingDataset,
    *,
    split_strategy: SplitStrategy = "random",
    test_fraction: float = 0.2,
    random_seed: int = 42,
    model_names: tuple[str, ...] | None = None,
) -> BenchmarkRun:
    """Create one split, fit each baseline independently, and evaluate one holdout."""
    split = split_dataset(
        dataset,
        strategy=split_strategy,
        test_fraction=test_fraction,
        random_seed=random_seed,
    )
    versions = {
        "python": sys.version.split()[0],
        "rdkit": rdBase.rdkitVersion,
        "numpy": np.__version__,
        "scikit_learn": sklearn.__version__,
    }
    model_results = evaluate_baselines(
        dataset,
        split,
        random_seed=random_seed,
        model_names=model_names,
    )
    warnings = [
        "Baseline models are not tuned; test-set results are not used for model selection.",
        "No external experimental dataset validation is asserted.",
    ]
    if split_strategy == "random":
        warnings.append(
            "Random splitting may place close analogues or members of the same "
            "scaffold in both partitions."
        )
    else:
        warnings.extend(
            (
                "Acyclic molecules share one empty Murcko scaffold group; scaffold "
                "group sizes may make the requested test fraction approximate or "
                "the split infeasible.",
                "Scaffold splitting does not prove independent chemical space.",
            )
        )
    return BenchmarkRun(
        run_id=_run_identifier(
            dataset,
            split_strategy,
            random_seed,
            test_fraction,
            model_names,
            versions,
        ),
        record_count=len(dataset.compound_ids),
        endpoint=dataset.endpoint,
        units=dataset.units,
        split_strategy=split_strategy,
        random_seed=random_seed,
        test_fraction=test_fraction,
        split_details=_split_details(split),
        feature_config=_feature_config_dict(dataset.feature_config),
        model_results=model_results,
        versions=versions,
        warnings=tuple(warnings),
    )


def write_benchmark_results(run: BenchmarkRun, path: str | Path) -> None:
    """Write a complete run result as stable, standards-compliant JSON."""
    destination = Path(path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(
        json.dumps(run.to_dict(), indent=2, sort_keys=True, allow_nan=False) + "\n",
        encoding="utf-8",
    )
