from __future__ import annotations

import pytest
from rdkit import Chem
from rdkit.Chem.Scaffolds import MurckoScaffold

from qsar_benchmark.config import DatasetSelection, FeatureConfig
from qsar_benchmark.data import DuplicateStructureError, load_dataset
from qsar_benchmark.pipelines import ModelingDataset, prepare_modeling_dataset
from qsar_benchmark.splitting import SplitError, split_dataset

SMILES = (
    "c1ccccc1",
    "Cc1ccccc1",
    "Oc1ccccc1",
    "c1ccncc1",
    "C1CCCCC1",
    "C1CCNCC1",
    "CCO",
    "CCC",
)


def _load_modeling_data(write_csv, smiles=SMILES):
    rows = [
        {
            "compound_id": f"cmp-{index}",
            "smiles": structure,
            "activity": str(index + 1),
            "endpoint": "Ki",
            "units": "nM",
            "assay_id": "assay-1",
        }
        for index, structure in enumerate(smiles)
    ]
    validated = load_dataset(write_csv(rows))
    return prepare_modeling_dataset(validated, endpoint="Ki", units="nM")


def test_random_split_is_reproducible_disjoint_and_reports_sizes(write_csv):
    dataset = _load_modeling_data(write_csv)
    first = split_dataset(dataset, test_fraction=0.25, random_seed=11)
    second = split_dataset(dataset, test_fraction=0.25, random_seed=11)

    assert first == second
    assert set(first.train_indices).isdisjoint(first.test_indices)
    assert first.train_size + first.test_size == len(dataset.compound_ids)
    assert first.test_size == 2


def test_scaffold_split_keeps_scaffold_groups_intact(write_csv):
    dataset = _load_modeling_data(write_csv)
    split = split_dataset(
        dataset,
        strategy="scaffold",
        test_fraction=0.25,
        random_seed=7,
    )
    train = set(split.train_indices)
    test = set(split.test_indices)
    for index, smiles in enumerate(dataset.canonical_smiles):
        molecule = Chem.MolFromSmiles(smiles)
        scaffold = MurckoScaffold.MurckoScaffoldSmiles(mol=molecule)
        matching = {
            other_index
            for other_index, other_smiles in enumerate(dataset.canonical_smiles)
            if MurckoScaffold.MurckoScaffoldSmiles(
                mol=Chem.MolFromSmiles(other_smiles)
            )
            == scaffold
        }
        assert not (matching & train and matching & test)
    assert split.scaffold_group_count == 5
    assert split.train_scaffold_group_count + split.test_scaffold_group_count == 5


def test_scaffold_split_is_reproducible(write_csv):
    dataset = _load_modeling_data(write_csv)
    first = split_dataset(dataset, strategy="scaffold", random_seed=19)
    second = split_dataset(dataset, strategy="scaffold", random_seed=19)
    assert first == second


def test_acyclic_molecules_share_the_explicit_empty_scaffold_group(write_csv):
    dataset = _load_modeling_data(write_csv, ("CCO", "CCC", "c1ccccc1"))
    split = split_dataset(
        dataset,
        strategy="scaffold",
        test_fraction=0.34,
        random_seed=2,
    )
    acyclic_indices = {0, 1}
    assert acyclic_indices <= set(split.train_indices) or acyclic_indices <= set(
        split.test_indices
    )


def test_infeasible_scaffold_split_raises_without_random_fallback(write_csv):
    dataset = _load_modeling_data(
        write_csv,
        ("c1ccccc1", "Cc1ccccc1", "Oc1ccccc1"),
    )
    with pytest.raises(SplitError, match="keeping every Bemis–Murcko"):
        split_dataset(dataset, strategy="scaffold", test_fraction=0.34)


def test_duplicate_accepted_structures_are_rejected_by_stage_2_policy(write_csv):
    validated = load_dataset(
        write_csv(
            [
                {
                    "compound_id": "cmp-1",
                    "smiles": "CCO",
                    "activity": "1",
                    "endpoint": "Ki",
                    "units": "nM",
                },
                {
                    "compound_id": "cmp-2",
                    "smiles": "OCC",
                    "activity": "2",
                    "endpoint": "Ki",
                    "units": "nM",
                },
                {
                    "compound_id": "cmp-3",
                    "smiles": "c1ccccc1",
                    "activity": "3",
                    "endpoint": "Ki",
                    "units": "nM",
                },
            ]
        )
    )
    with pytest.raises(DuplicateStructureError):
        prepare_modeling_dataset(validated, endpoint="Ki", units="nM")


def test_split_rejects_duplicate_structure_leakage():
    dataset = ModelingDataset(
        features=[[1.0], [2.0]],
        targets=[1.0, 2.0],
        compound_ids=("a", "b"),
        source_rows=(1, 2),
        canonical_smiles=("CCO", "CCO"),
        endpoint="Ki",
        units="nM",
        feature_config=FeatureConfig(),
    )
    with pytest.raises(SplitError, match="Duplicate canonical structures"):
        split_dataset(dataset)


@pytest.mark.parametrize(
    ("smiles", "test_fraction", "message"),
    [
        (("CCO",), 0.2, "At least two compounds"),
        (("CCO", "CCC"), 0.0, "test_fraction"),
        (("CCO", "CCC"), 1.0, "test_fraction"),
    ],
)
def test_small_or_invalid_random_splits_raise(write_csv, smiles, test_fraction, message):
    dataset = _load_modeling_data(write_csv, smiles)
    with pytest.raises(SplitError, match=message):
        split_dataset(dataset, test_fraction=test_fraction)


def test_dataset_split_requires_exact_endpoint_and_units(write_csv):
    validated = load_dataset(
        write_csv(
            [
                {
                    "compound_id": "cmp-1",
                    "smiles": "CCO",
                    "activity": "1",
                    "endpoint": "Ki",
                    "units": "nM",
                },
                {
                    "compound_id": "cmp-2",
                    "smiles": "CCC",
                    "activity": "2",
                    "endpoint": "Ki",
                    "units": "nM",
                },
            ]
        ),
        selection=DatasetSelection(endpoint="Ki", units="nM"),
    )
    with pytest.raises(ValueError, match="do not match validated dataset units"):
        prepare_modeling_dataset(validated, endpoint="Ki", units="uM")
