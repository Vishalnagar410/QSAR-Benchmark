"""Reproducible random and Bemis–Murcko scaffold dataset splitting."""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import TYPE_CHECKING, Literal

import numpy as np
from rdkit import Chem
from rdkit.Chem.Scaffolds import MurckoScaffold
from sklearn.model_selection import train_test_split

if TYPE_CHECKING:
    from qsar_benchmark.pipelines import ModelingDataset

SplitStrategy = Literal["random", "scaffold"]


class SplitError(ValueError):
    """Raised when a requested split cannot satisfy its partition constraints."""


@dataclass(frozen=True)
class DataSplit:
    strategy: SplitStrategy
    train_indices: tuple[int, ...]
    test_indices: tuple[int, ...]
    scaffold_group_count: int
    train_scaffold_group_count: int
    test_scaffold_group_count: int

    @property
    def train_size(self) -> int:
        return len(self.train_indices)

    @property
    def test_size(self) -> int:
        return len(self.test_indices)


def _validate_split_inputs(
    dataset: ModelingDataset,
    test_fraction: float,
    random_seed: int,
) -> None:
    if isinstance(test_fraction, bool) or not isinstance(test_fraction, (int, float)):
        raise SplitError("test_fraction must be a finite number between 0 and 1.")
    if not math.isfinite(test_fraction) or not 0 < test_fraction < 1:
        raise SplitError("test_fraction must be greater than 0 and less than 1.")
    if isinstance(random_seed, bool) or not isinstance(random_seed, int):
        raise SplitError("random_seed must be a non-negative integer.")
    if random_seed < 0:
        raise SplitError("random_seed must be a non-negative integer.")
    if len(dataset.compound_ids) < 2:
        raise SplitError("At least two compounds are required for a train/test split.")
    if len(set(dataset.canonical_smiles)) != len(dataset.canonical_smiles):
        raise SplitError(
            "Duplicate canonical structures are not permitted in a modelling "
            "dataset under the default replicate policy."
        )


def _scaffold_groups(dataset: ModelingDataset) -> list[tuple[int, ...]]:
    grouped_indices: dict[str, list[int]] = {}
    for index, smiles in enumerate(dataset.canonical_smiles):
        molecule = Chem.MolFromSmiles(smiles)
        if molecule is None:
            raise SplitError(
                f"Could not parse validated canonical SMILES for compound "
                f"{dataset.compound_ids[index]!r}."
            )
        scaffold = MurckoScaffold.MurckoScaffoldSmiles(
            mol=molecule,
            includeChirality=False,
        )
        grouped_indices.setdefault(scaffold, []).append(index)
    return [tuple(indices) for indices in grouped_indices.values()]


def split_dataset(
    dataset: ModelingDataset,
    *,
    strategy: SplitStrategy = "random",
    test_fraction: float = 0.2,
    random_seed: int = 42,
) -> DataSplit:
    """Split row indices without separating duplicate structures or scaffolds."""
    _validate_split_inputs(dataset, test_fraction, random_seed)
    if strategy not in ("random", "scaffold"):
        raise SplitError("strategy must be either 'random' or 'scaffold'.")

    if strategy == "random":
        try:
            train, test = train_test_split(
                np.arange(len(dataset.compound_ids)),
                test_size=test_fraction,
                random_state=random_seed,
                shuffle=True,
            )
        except ValueError as error:
            raise SplitError(f"Cannot create the requested random split: {error}") from error
        train_indices = tuple(int(index) for index in train)
        test_indices = tuple(int(index) for index in test)
        groups = _scaffold_groups(dataset)
        train_group_count = sum(
            any(index in train_indices for index in group) for group in groups
        )
        test_group_count = sum(
            any(index in test_indices for index in group) for group in groups
        )
        return DataSplit(
            strategy=strategy,
            train_indices=train_indices,
            test_indices=test_indices,
            scaffold_group_count=len(groups),
            train_scaffold_group_count=train_group_count,
            test_scaffold_group_count=test_group_count,
        )

    groups = _scaffold_groups(dataset)
    target_test_size = math.ceil(len(dataset.compound_ids) * test_fraction)
    rng = np.random.default_rng(random_seed)
    tie_breakers = rng.random(len(groups))
    ordered_groups = sorted(
        zip(groups, tie_breakers, strict=True),
        key=lambda item: (-len(item[0]), item[1]),
    )
    train_groups: list[tuple[int, ...]] = []
    test_groups: list[tuple[int, ...]] = []
    test_size = 0
    for group, _ in ordered_groups:
        if abs(test_size + len(group) - target_test_size) < abs(
            test_size - target_test_size
        ):
            test_groups.append(group)
            test_size += len(group)
        else:
            train_groups.append(group)

    if not test_groups or not train_groups:
        raise SplitError(
            "Cannot create a non-empty scaffold train/test split while keeping "
            "every Bemis–Murcko scaffold group intact."
        )

    train_indices = tuple(
        index for group in train_groups for index in group
    )
    test_indices = tuple(index for group in test_groups for index in group)
    return DataSplit(
        strategy=strategy,
        train_indices=train_indices,
        test_indices=test_indices,
        scaffold_group_count=len(groups),
        train_scaffold_group_count=len(train_groups),
        test_scaffold_group_count=len(test_groups),
    )
