"""Validated API request and response models."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from qsar_benchmark.config import (
    ColumnMapping,
    FeatureConfig,
    FingerprintConfig,
)

ModelName = Literal["dummy_mean", "ridge", "random_forest"]
SplitName = Literal["random", "scaffold"]
DownloadFormat = Literal["json", "csv"]


class APIModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ColumnMappingRequest(APIModel):
    compound_id: str = "compound_id"
    smiles: str = "smiles"
    activity: str = "activity"
    endpoint: str | None = "endpoint"
    units: str | None = "units"
    assay_id: str | None = "assay_id"

    def to_domain(self) -> ColumnMapping:
        return ColumnMapping(**self.model_dump())


class DatasetSelectionRequest(APIModel):
    endpoint: str | None = None
    units: str | None = None
    assay_id: str | None = None

    def to_domain(self):
        from qsar_benchmark.config import DatasetSelection

        return DatasetSelection(**self.model_dump())


class FeatureConfigurationRequest(APIModel):
    include_descriptors: bool = True
    include_morgan: bool = False
    fingerprint_radius: int = Field(default=2, ge=0)
    fingerprint_n_bits: int = Field(default=2048, ge=1)
    fingerprint_include_chirality: bool = True

    def to_domain(self) -> FeatureConfig:
        return FeatureConfig(
            include_descriptors=self.include_descriptors,
            include_morgan=self.include_morgan,
            fingerprint=FingerprintConfig(
                radius=self.fingerprint_radius,
                n_bits=self.fingerprint_n_bits,
                include_chirality=self.fingerprint_include_chirality,
            ),
        )

    def as_dict(self) -> dict[str, object]:
        return {
            "include_descriptors": self.include_descriptors,
            "include_morgan": self.include_morgan,
            "fingerprint": {
                "radius": self.fingerprint_radius,
                "n_bits": self.fingerprint_n_bits,
                "include_chirality": self.fingerprint_include_chirality,
            },
        }


class ValidationRequest(APIModel):
    selection: DatasetSelectionRequest = Field(
        default_factory=DatasetSelectionRequest
    )
    columns: ColumnMappingRequest = Field(default_factory=ColumnMappingRequest)


class FeatureRequest(ValidationRequest):
    feature_config: FeatureConfigurationRequest = Field(
        default_factory=FeatureConfigurationRequest
    )


class ExperimentRequest(APIModel):
    dataset_id: str
    endpoint: str = Field(min_length=1)
    units: str = Field(min_length=1)
    assay_id: str | None = None
    feature_config: FeatureConfigurationRequest = Field(
        default_factory=FeatureConfigurationRequest
    )
    split_strategy: SplitName
    test_fraction: float = Field(gt=0, lt=1)
    random_seed: int = Field(ge=0)
    selected_models: list[ModelName] = Field(min_length=1)
    columns: ColumnMappingRequest = Field(default_factory=ColumnMappingRequest)

    @field_validator("endpoint", "units")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Value must not be empty.")
        return cleaned

    @field_validator("selected_models")
    @classmethod
    def model_names_must_be_unique(
        cls,
        value: list[ModelName],
    ) -> list[ModelName]:
        if len(set(value)) != len(value):
            raise ValueError("Selected models must be unique.")
        return value


class ErrorDetail(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    error: ErrorDetail


class HealthResponse(BaseModel):
    status: Literal["ok"]
    application_version: str


class VersionResponse(BaseModel):
    application_version: str
    python_version: str
    rdkit_version: str
    numpy_version: str
    scikit_learn_version: str


class DatasetMetadataResponse(BaseModel):
    dataset_id: str
    original_filename: str
    uploaded_at: str
    record_count: int
    validation_status: str
    endpoint: str | None = None
    units: str | None = None
    accepted_record_count: int | None = None
    rejected_record_count: int | None = None


class DatasetListResponse(BaseModel):
    datasets: list[DatasetMetadataResponse]


class DatasetValidationResponse(BaseModel):
    dataset_id: str
    source_row_count: int
    accepted_record_count: int
    rejected_record_count: int
    invalid_smiles_count: int
    missing_value_record_count: int
    duplicate_structure_group_count: int
    endpoint: str | None
    units: str | None
    assay_id: str | None
    diagnostics: list[dict[str, Any]]
    duplicate_structures: list[dict[str, Any]]
    validation_status: str


class FeatureGenerationResponse(BaseModel):
    dataset_id: str
    endpoint: str | None
    units: str | None
    feature_config: dict[str, Any]
    feature_names: list[str]
    record_count: int
    records: list[dict[str, Any]]


class ExperimentMetadataResponse(BaseModel):
    experiment_id: str
    dataset_id: str
    endpoint: str
    units: str
    assay_id: str | None = None
    feature_config: dict[str, Any]
    split_strategy: SplitName
    test_fraction: float
    random_seed: int
    selected_models: list[ModelName]
    status: str
    created_at: str
    started_at: str | None
    completed_at: str | None
    error_summary: str | None
    run_id: str | None = None


class ExperimentListResponse(BaseModel):
    experiments: list[ExperimentMetadataResponse]


class ModelMetricsResponse(BaseModel):
    r2: float | None
    rmse: float
    mae: float


class ModelResultResponse(BaseModel):
    name: str
    configuration: dict[str, Any]
    training_sample_count: int
    test_sample_count: int
    train_compound_ids: list[str]
    test_compound_ids: list[str]
    train_source_rows: list[int]
    test_source_rows: list[int]
    test_actual_values: list[float]
    test_predicted_values: list[float]
    metrics: ModelMetricsResponse
    evaluation_status: str
    limitations: list[str]


class BenchmarkResultsResponse(BaseModel):
    run_id: str
    dataset: dict[str, Any]
    split: dict[str, Any]
    feature_config: dict[str, Any]
    models: list[ModelResultResponse]
    versions: dict[str, str]
    warnings: list[str]


class PredictionResponse(BaseModel):
    model: str
    compound_id: str
    source_row: int
    actual: float
    predicted: float
    residual: float
