"""Baseline regression models and transparent holdout evaluation metrics."""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import TYPE_CHECKING, Mapping

import numpy as np
from rdkit import Chem
from rdkit.Chem.Scaffolds import MurckoScaffold
from sklearn.dummy import DummyRegressor
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from qsar_benchmark.splitting import DataSplit

if TYPE_CHECKING:
    from qsar_benchmark.pipelines import ModelingDataset


@dataclass(frozen=True)
class RegressionMetrics:
    r2: float | None
    rmse: float
    mae: float
    n_train: int
    n_test: int
    status: str
    limitations: tuple[str, ...]


@dataclass(frozen=True)
class EvaluationResult:
    model_name: str
    model_configuration: Mapping[str, object]
    metrics: RegressionMetrics
    train_compound_ids: tuple[str, ...]
    test_compound_ids: tuple[str, ...]
    train_source_rows: tuple[int, ...]
    test_source_rows: tuple[int, ...]
    test_actual_values: tuple[float, ...]
    test_predicted_values: tuple[float, ...]


def calculate_regression_metrics(
    y_true: np.ndarray | list[float],
    y_pred: np.ndarray | list[float],
    *,
    n_train: int,
) -> RegressionMetrics:
    """Calculate holdout metrics, retaining undefined R² as ``None``."""
    actual = np.asarray(y_true, dtype=np.float64)
    predicted = np.asarray(y_pred, dtype=np.float64)
    if actual.ndim != 1 or predicted.ndim != 1:
        raise ValueError("y_true and y_pred must be one-dimensional.")
    if actual.size == 0:
        raise ValueError("At least one test sample is required to calculate metrics.")
    if actual.shape != predicted.shape:
        raise ValueError("y_true and y_pred must have the same number of samples.")
    if isinstance(n_train, bool) or not isinstance(n_train, int) or n_train < 1:
        raise ValueError("n_train must be a positive integer.")
    if not np.isfinite(actual).all():
        raise ValueError("y_true contains NaN or infinite values.")
    if not np.isfinite(predicted).all():
        raise ValueError("Predictions contain NaN or infinite values.")

    limitations: list[str] = []
    r2: float | None
    if actual.size < 2:
        r2 = None
        limitations.append("R² is undefined with fewer than two test samples.")
    elif np.ptp(actual) == 0:
        r2 = None
        limitations.append("R² is undefined because the test targets are constant.")
    else:
        r2 = float(r2_score(actual, predicted, force_finite=False))
        if not math.isfinite(r2):
            r2 = None
            limitations.append("R² is undefined for these test targets and predictions.")

    rmse = float(np.sqrt(mean_squared_error(actual, predicted)))
    mae = float(mean_absolute_error(actual, predicted))
    if not math.isfinite(rmse) or not math.isfinite(mae):
        raise ValueError("RMSE or MAE is not finite for these targets and predictions.")

    return RegressionMetrics(
        r2=r2,
        rmse=rmse,
        mae=mae,
        n_train=n_train,
        n_test=int(actual.size),
        status="partial" if limitations else "complete",
        limitations=tuple(limitations),
    )


def baseline_model_configurations(random_seed: int) -> dict[str, dict[str, object]]:
    """Return explicit, fixed baseline settings without parameter search."""
    return {
        "dummy_mean": {"estimator": "DummyRegressor", "strategy": "mean"},
        "ridge": {
            "estimator": "Pipeline",
            "steps": [
                {"name": "scaler", "estimator": "StandardScaler"},
                {"name": "regressor", "estimator": "Ridge"},
            ],
            "scaler": {
                "with_mean": True,
                "with_std": True,
                "fit_on": "training data only",
            },
            "alpha": 1.0,
            "fit_intercept": True,
        },
        "random_forest": {
            "estimator": "RandomForestRegressor",
            "n_estimators": 200,
            "criterion": "squared_error",
            "max_features": 1.0,
            "min_samples_leaf": 1,
            "random_state": random_seed,
            "n_jobs": 1,
        },
    }


def _new_baseline_models(random_seed: int):
    return (
        (
            "dummy_mean",
            DummyRegressor(strategy="mean"),
        ),
        (
            "ridge",
            Pipeline(
                [
                    ("scaler", StandardScaler(with_mean=True, with_std=True)),
                    ("regressor", Ridge(alpha=1.0, fit_intercept=True)),
                ]
            ),
        ),
        (
            "random_forest",
            RandomForestRegressor(
                n_estimators=200,
                criterion="squared_error",
                max_features=1.0,
                min_samples_leaf=1,
                random_state=random_seed,
                n_jobs=1,
            ),
        ),
    )


def evaluate_baselines(
    dataset: ModelingDataset,
    split: DataSplit,
    *,
    random_seed: int,
    model_names: tuple[str, ...] | None = None,
) -> tuple[EvaluationResult, ...]:
    """Fit each fresh baseline on identical training rows and evaluate one holdout."""
    available_models = {"dummy_mean", "ridge", "random_forest"}
    selected_models = (
        ("dummy_mean", "ridge", "random_forest")
        if model_names is None
        else model_names
    )
    if not selected_models:
        raise ValueError("At least one baseline model must be selected.")
    if len(set(selected_models)) != len(selected_models):
        raise ValueError("Selected baseline model names must be unique.")
    unknown_models = sorted(set(selected_models) - available_models)
    if unknown_models:
        raise ValueError(
            "Unsupported baseline model names: " + ", ".join(unknown_models)
        )
    train_indices = np.asarray(split.train_indices, dtype=np.intp)
    test_indices = np.asarray(split.test_indices, dtype=np.intp)
    if train_indices.size == 0 or test_indices.size == 0:
        raise ValueError("Both training and test partitions must be non-empty.")
    if np.intersect1d(train_indices, test_indices).size:
        raise ValueError("Training and test partitions overlap.")
    if (
        np.any(train_indices < 0)
        or np.any(test_indices < 0)
        or np.any(train_indices >= dataset.targets.size)
        or np.any(test_indices >= dataset.targets.size)
    ):
        raise ValueError("Split indices are outside the modelling dataset.")
    if train_indices.size + test_indices.size != dataset.targets.size:
        raise ValueError("Partitions must include every modelling dataset row exactly once.")
    train_structures = {
        dataset.canonical_smiles[int(index)] for index in train_indices
    }
    test_structures = {
        dataset.canonical_smiles[int(index)] for index in test_indices
    }
    if train_structures.intersection(test_structures):
        raise ValueError("Identical canonical structures occur in both partitions.")
    if split.strategy == "scaffold":

        def scaffold(smiles: str) -> str:
            molecule = Chem.MolFromSmiles(smiles)
            if molecule is None:
                raise ValueError("Could not parse a validated canonical structure.")
            return MurckoScaffold.MurckoScaffoldSmiles(
                mol=molecule,
                includeChirality=False,
            )

        train_scaffolds = {
            scaffold(dataset.canonical_smiles[int(index)]) for index in train_indices
        }
        test_scaffolds = {
            scaffold(dataset.canonical_smiles[int(index)]) for index in test_indices
        }
        if train_scaffolds.intersection(test_scaffolds):
            raise ValueError("Bemis–Murcko scaffold groups occur in both partitions.")

    x_train = dataset.features[train_indices]
    y_train = dataset.targets[train_indices]
    x_test = dataset.features[test_indices]
    y_test = dataset.targets[test_indices]
    configurations = baseline_model_configurations(random_seed)

    results: list[EvaluationResult] = []
    for model_name, estimator in _new_baseline_models(random_seed):
        if model_name not in selected_models:
            continue
        estimator.fit(x_train, y_train)
        predictions = estimator.predict(x_test)
        metrics = calculate_regression_metrics(
            y_test,
            predictions,
            n_train=int(train_indices.size),
        )
        results.append(
            EvaluationResult(
                model_name=model_name,
                model_configuration=configurations[model_name],
                metrics=metrics,
                train_compound_ids=tuple(
                    dataset.compound_ids[index] for index in train_indices
                ),
                test_compound_ids=tuple(
                    dataset.compound_ids[index] for index in test_indices
                ),
                train_source_rows=tuple(
                    dataset.source_rows[index] for index in train_indices
                ),
                test_source_rows=tuple(
                    dataset.source_rows[index] for index in test_indices
                ),
                test_actual_values=tuple(float(value) for value in y_test),
                test_predicted_values=tuple(float(value) for value in predictions),
            )
        )
    return tuple(results)
