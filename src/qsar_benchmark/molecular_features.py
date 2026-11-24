"""Molecular parsing, canonical representations, and RDKit features."""

from __future__ import annotations

import math
from dataclasses import dataclass
from types import MappingProxyType
from typing import Mapping

import numpy as np
from rdkit import Chem, DataStructs, rdBase
from rdkit.Chem import (
    Crippen,
    Descriptors,
    Lipinski,
    rdFingerprintGenerator,
    rdMolDescriptors,
)

from qsar_benchmark.config import FeatureConfig

DESCRIPTOR_NAMES = (
    "rdkit_molecular_weight",
    "rdkit_crippen_mol_log_p",
    "rdkit_topological_polar_surface_area",
    "rdkit_h_bond_donor_count",
    "rdkit_h_bond_acceptor_count",
    "rdkit_rotatable_bond_count",
    "rdkit_heavy_atom_count",
    "rdkit_ring_count",
)


@dataclass(frozen=True)
class MolecularFeatures:
    canonical_smiles: str
    descriptors: Mapping[str, float]
    morgan_fingerprint: tuple[int, ...] | None
    rdkit_version: str


class InvalidSmilesError(ValueError):
    """Raised when RDKit cannot parse or sanitize an input SMILES string."""


def canonicalize_smiles(smiles: str) -> tuple[Chem.Mol, str]:
    """Parse SMILES and return RDKit's canonical, stereochemistry-aware form."""
    if not smiles.strip():
        raise InvalidSmilesError("SMILES is missing or empty.")
    molecule = Chem.MolFromSmiles(smiles)
    if molecule is None:
        raise InvalidSmilesError("RDKit could not parse the SMILES string.")
    canonical_smiles = Chem.MolToSmiles(
        molecule,
        canonical=True,
        isomericSmiles=True,
    )
    return molecule, canonical_smiles


def calculate_molecular_features(
    smiles: str,
    config: FeatureConfig = FeatureConfig(),
) -> MolecularFeatures:
    """Calculate configured descriptors and/or a Morgan bit vector."""
    molecule, canonical_smiles = canonicalize_smiles(smiles)
    descriptors: dict[str, float] = {}
    if config.include_descriptors:
        calculated: dict[str, float] = {
            "rdkit_molecular_weight": float(Descriptors.MolWt(molecule)),
            "rdkit_crippen_mol_log_p": float(Crippen.MolLogP(molecule)),
            "rdkit_topological_polar_surface_area": float(
                rdMolDescriptors.CalcTPSA(molecule)
            ),
            "rdkit_h_bond_donor_count": float(Lipinski.NumHDonors(molecule)),
            "rdkit_h_bond_acceptor_count": float(Lipinski.NumHAcceptors(molecule)),
            "rdkit_rotatable_bond_count": float(Lipinski.NumRotatableBonds(molecule)),
            "rdkit_heavy_atom_count": float(Descriptors.HeavyAtomCount(molecule)),
            "rdkit_ring_count": float(rdMolDescriptors.CalcNumRings(molecule)),
        }
        non_finite = [
            name for name, value in calculated.items() if not math.isfinite(value)
        ]
        if non_finite:
            raise ValueError(
                "RDKit returned non-finite descriptors: " + ", ".join(non_finite)
            )
        descriptors = calculated

    fingerprint: tuple[int, ...] | None = None
    if config.include_morgan:
        fingerprint_config = config.fingerprint
        generator = rdFingerprintGenerator.GetMorganGenerator(
            radius=fingerprint_config.radius,
            fpSize=fingerprint_config.n_bits,
            includeChirality=fingerprint_config.include_chirality,
        )
        bit_vector = generator.GetFingerprint(molecule)
        bits = np.zeros(fingerprint_config.n_bits, dtype=np.uint8)
        DataStructs.ConvertToNumpyArray(bit_vector, bits)
        fingerprint = tuple(int(bit) for bit in bits.tolist())

    return MolecularFeatures(
        canonical_smiles=canonical_smiles,
        descriptors=MappingProxyType(descriptors),
        morgan_fingerprint=fingerprint,
        rdkit_version=rdBase.rdkitVersion,
    )
