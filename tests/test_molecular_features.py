from __future__ import annotations

import math

import pytest

from qsar_benchmark.config import FeatureConfig, FingerprintConfig
from qsar_benchmark.molecular_features import (
    DESCRIPTOR_NAMES,
    InvalidSmilesError,
    calculate_molecular_features,
    canonicalize_smiles,
)


def test_ethanol_descriptor_values_are_documented_rdkit_calculations():
    features = calculate_molecular_features("CCO")
    assert set(features.descriptors) == set(DESCRIPTOR_NAMES)
    assert features.descriptors["rdkit_molecular_weight"] == pytest.approx(46.069)
    assert features.descriptors["rdkit_crippen_mol_log_p"] == pytest.approx(-0.0014)
    assert features.descriptors["rdkit_topological_polar_surface_area"] == pytest.approx(
        20.23
    )
    assert features.descriptors["rdkit_h_bond_donor_count"] == 1
    assert features.descriptors["rdkit_h_bond_acceptor_count"] == 1
    assert features.descriptors["rdkit_rotatable_bond_count"] == 0
    assert features.descriptors["rdkit_heavy_atom_count"] == 3
    assert features.descriptors["rdkit_ring_count"] == 0
    assert all(math.isfinite(value) for value in features.descriptors.values())


def test_canonical_smiles_preserve_stereochemistry():
    _, canonical = canonicalize_smiles("N[C@@](C)(O)C(=O)O")
    assert "@" in canonical


def test_morgan_fingerprint_has_configured_dimensions_and_settings():
    config = FeatureConfig(
        include_descriptors=False,
        include_morgan=True,
        fingerprint=FingerprintConfig(radius=3, n_bits=256, include_chirality=True),
    )
    features = calculate_molecular_features("CCO", config)
    assert features.descriptors == {}
    assert features.morgan_fingerprint is not None
    assert len(features.morgan_fingerprint) == 256
    assert set(features.morgan_fingerprint) <= {0, 1}
    assert sum(features.morgan_fingerprint) > 0


def test_feature_calculation_is_reproducible():
    first = calculate_molecular_features("CCO", FeatureConfig(include_morgan=True))
    second = calculate_molecular_features("CCO", FeatureConfig(include_morgan=True))
    assert first.canonical_smiles == second.canonical_smiles
    assert dict(first.descriptors) == dict(second.descriptors)
    assert first.morgan_fingerprint == second.morgan_fingerprint
    assert first.rdkit_version == second.rdkit_version


def test_invalid_smiles_raises_clear_exception():
    with pytest.raises(InvalidSmilesError, match="could not parse"):
        calculate_molecular_features("not a smiles")


def test_stereo_sensitive_fingerprints_are_configurable():
    config = FeatureConfig(
        include_descriptors=False,
        include_morgan=True,
        fingerprint=FingerprintConfig(radius=2, n_bits=512, include_chirality=True),
    )
    first = calculate_molecular_features("N[C@@](C)(O)C(=O)O", config)
    second = calculate_molecular_features("N[C@](C)(O)C(=O)O", config)
    assert first.canonical_smiles != second.canonical_smiles
    assert first.morgan_fingerprint != second.morgan_fingerprint

