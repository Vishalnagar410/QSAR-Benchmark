from __future__ import annotations

import numpy as np
import pytest

import qsar_benchmark.evaluation as evaluation
from qsar_benchmark.config import FeatureConfig
from qsar_benchmark.evaluation import (
    calculate_regression_metrics,
    evaluate_baselines,
)
from qsar_benchmark.pipelines import ModelingDataset
from qsar_benchmark.splitting import DataSplit


def test_regression_metrics_calculate_r2_rmse_mae_and_counts():
    metrics = calculate_regression_metrics(
        [1.0, 2.0, 3.0],
        [1.0, 2.0, 2.0],
        n_train=5,
    )
    assert metrics.r2 == pytest.approx(0.5)
    assert metrics.rmse == pytest.approx(np.sqrt(1 / 3))
    assert metrics.mae == pytest.approx(1 / 3)
    assert (metrics.n_train, metrics.n_test) == (5, 3)
    assert metrics.status == "complete"


def test_negative_r2_is_preserved():
    metrics = calculate_regression_metrics(
        [1.0, 2.0, 3.0],
        [10.0, 10.0, 10.0],
        n_train=2,
    )
    assert metrics.r2 is not None and metrics.r2 < 0


def test_r2_is_undefined_for_single_or_constant_test_targets():
    single = calculate_regression_metrics([2.0], [3.0], n_train=4)
    constant = calculate_regression_metrics(
        [2.0, 2.0, 2.0],
        [2.0, 1.0, 4.0],
        n_train=4,
    )
    assert single.r2 is None
    assert "fewer than two" in single.limitations[0]
    assert constant.r2 is None
    assert "constant" in constant.limitations[0]
    assert single.status == constant.status == "partial"


@pytest.mark.parametrize(
    ("actual", "predicted", "message"),
    [
        ([1.0], [float("nan")], "Predictions contain NaN"),
        ([1.0], [float("inf")], "Predictions contain NaN"),
        ([float("nan")], [1.0], "y_true contains"),
        ([1.0, 2.0], [1.0], "same number of samples"),
        ([[1.0]], [[1.0]], "one-dimensional"),
        ([], [], "At least one test sample"),
    ],
)
def test_invalid_metric_inputs_are_reported(actual, predicted, message):
    with pytest.raises(ValueError, match=message):
        calculate_regression_metrics(actual, predicted, n_train=1)


def test_baselines_use_identical_partitions_and_train_only_scaling(monkeypatch):
    dataset = ModelingDataset(
        features=[[0.0], [2.0], [100.0], [200.0]],
        targets=[0.0, 2.0, 100.0, 200.0],
        compound_ids=("a", "b", "c", "d"),
        source_rows=(1, 2, 3, 4),
        canonical_smiles=("CCO", "CCC", "CCN", "CCCl"),
        endpoint="Ki",
        units="nM",
        feature_config=FeatureConfig(),
    )
    split = DataSplit(
        strategy="random",
        train_indices=(0, 1, 2),
        test_indices=(3,),
        scaffold_group_count=4,
        train_scaffold_group_count=3,
        test_scaffold_group_count=1,
    )
    fitted_rows = []
    original_scaler = evaluation.StandardScaler

    class TrackingScaler(original_scaler):
        def fit(self, x, y=None, sample_weight=None):
            fitted_rows.append(np.array(x, copy=True))
            return super().fit(x, y=y, sample_weight=sample_weight)

    monkeypatch.setattr(evaluation, "StandardScaler", TrackingScaler)
    results = evaluate_baselines(dataset, split, random_seed=13)

    assert [result.model_name for result in results] == [
        "dummy_mean",
        "ridge",
        "random_forest",
    ]
    assert all(result.train_source_rows == (1, 2, 3) for result in results)
    assert all(result.test_source_rows == (4,) for result in results)
    assert all(result.metrics.n_train == 3 and result.metrics.n_test == 1 for result in results)
    assert len(fitted_rows) == 1
    np.testing.assert_array_equal(fitted_rows[0], dataset.features[[0, 1, 2]])
    assert fitted_rows[0].shape[0] != dataset.features.shape[0]
    assert results[2].model_configuration["random_state"] == 13


def test_evaluator_rejects_missing_rows_and_scaffold_leakage():
    dataset = ModelingDataset(
        features=[[0.0], [1.0], [2.0], [3.0]],
        targets=[0.0, 1.0, 2.0, 3.0],
        compound_ids=("a", "b", "c", "d"),
        source_rows=(1, 2, 3, 4),
        canonical_smiles=("c1ccccc1", "Cc1ccccc1", "CCO", "CCC"),
        endpoint="Ki",
        units="nM",
        feature_config=FeatureConfig(),
    )
    incomplete = DataSplit(
        strategy="random",
        train_indices=(0, 1),
        test_indices=(2,),
        scaffold_group_count=3,
        train_scaffold_group_count=1,
        test_scaffold_group_count=1,
    )
    with pytest.raises(ValueError, match="every modelling dataset row"):
        evaluate_baselines(dataset, incomplete, random_seed=3)

    leaking = DataSplit(
        strategy="scaffold",
        train_indices=(0, 2),
        test_indices=(1, 3),
        scaffold_group_count=3,
        train_scaffold_group_count=2,
        test_scaffold_group_count=2,
    )
    with pytest.raises(ValueError, match="Bemis–Murcko scaffold groups"):
        evaluate_baselines(dataset, leaking, random_seed=3)
