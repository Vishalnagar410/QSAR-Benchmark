"""Validated configuration for CSV ingestion and molecular features."""

from dataclasses import dataclass


@dataclass(frozen=True)
class ColumnMapping:
    compound_id: str = "compound_id"
    smiles: str = "smiles"
    activity: str = "activity"
    endpoint: str | None = "endpoint"
    units: str | None = "units"
    assay_id: str | None = "assay_id"

    def __post_init__(self) -> None:
        required = (self.compound_id, self.smiles, self.activity)
        if any(not value.strip() for value in required):
            raise ValueError("Required column names must be non-empty.")
        optional = [
            value
            for value in (self.endpoint, self.units, self.assay_id)
            if value is not None
        ]
        if len(set(required + tuple(optional))) != len(required) + len(optional):
            raise ValueError("Column mappings must refer to distinct columns.")


@dataclass(frozen=True)
class DatasetSelection:
    endpoint: str | None = None
    units: str | None = None
    assay_id: str | None = None

    def __post_init__(self) -> None:
        for name, value in (
            ("endpoint", self.endpoint),
            ("units", self.units),
            ("assay_id", self.assay_id),
        ):
            if value is not None and not value.strip():
                raise ValueError(f"Selected {name} must be non-empty.")


@dataclass(frozen=True)
class FingerprintConfig:
    radius: int = 2
    n_bits: int = 2048
    include_chirality: bool = True

    def __post_init__(self) -> None:
        if self.radius < 0:
            raise ValueError("Morgan fingerprint radius must be non-negative.")
        if self.n_bits < 1:
            raise ValueError("Morgan fingerprint size must be positive.")


@dataclass(frozen=True)
class FeatureConfig:
    include_descriptors: bool = True
    include_morgan: bool = False
    fingerprint: FingerprintConfig = FingerprintConfig()

    def __post_init__(self) -> None:
        if not self.include_descriptors and not self.include_morgan:
            raise ValueError("At least one molecular feature representation is required.")

