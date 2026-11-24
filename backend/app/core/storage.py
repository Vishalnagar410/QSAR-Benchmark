"""Atomic, identifier-scoped local filesystem storage."""

from __future__ import annotations

import json
import os
import re
import tempfile
import threading
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from backend.app.core.exceptions import ResourceNotFoundError

_RESOURCE_ID = re.compile(r"^[0-9a-f]{32}$")


def _validate_id(identifier: str) -> str:
    if not _RESOURCE_ID.fullmatch(identifier):
        raise ResourceNotFoundError("The requested resource was not found.")
    return identifier


class LocalStorage:
    def __init__(self, root: str | Path) -> None:
        self.root = Path(root).expanduser().resolve()
        self.uploads_dir = self.root / "uploads"
        self.datasets_dir = self.root / "datasets"
        self.validation_dir = self.root / "validation_reports"
        self.features_dir = self.root / "features"
        self.experiments_dir = self.root / "experiments"
        self._lock = threading.RLock()
        for directory in (
            self.uploads_dir,
            self.datasets_dir,
            self.validation_dir,
            self.features_dir,
            self.experiments_dir,
        ):
            directory.mkdir(parents=True, exist_ok=True)

    @staticmethod
    def new_id() -> str:
        return uuid.uuid4().hex

    def upload_path(self, dataset_id: str) -> Path:
        identifier = _validate_id(dataset_id)
        path = self.uploads_dir / f"{identifier}.csv"
        if not path.is_file():
            raise ResourceNotFoundError("The requested dataset was not found.")
        return path

    def dataset_metadata_path(self, dataset_id: str) -> Path:
        return self.datasets_dir / f"{_validate_id(dataset_id)}.json"

    def get_dataset(self, dataset_id: str) -> dict[str, Any]:
        path = self.dataset_metadata_path(dataset_id)
        if not path.is_file():
            raise ResourceNotFoundError("The requested dataset was not found.")
        return self._read_json(path)

    def list_datasets(self) -> list[dict[str, Any]]:
        return sorted(
            (
                self._read_json(path)
                for path in self.datasets_dir.glob("*.json")
                if path.is_file()
            ),
            key=lambda item: item["uploaded_at"],
            reverse=True,
        )

    def save_upload(
        self,
        content: bytes,
        *,
        display_filename: str,
        record_count: int,
    ) -> dict[str, Any]:
        with self._lock:
            dataset_id = self.new_id()
            upload_path = self.uploads_dir / f"{dataset_id}.csv"
            metadata_path = self.dataset_metadata_path(dataset_id)
            metadata = {
                "dataset_id": dataset_id,
                "original_filename": display_filename,
                "uploaded_at": datetime.now(UTC).isoformat(),
                "record_count": record_count,
                "validation_status": "not_validated",
                "endpoint": None,
                "units": None,
            }
            upload_created = False
            try:
                with upload_path.open("xb") as handle:
                    upload_created = True
                    handle.write(content)
                    handle.flush()
                    os.fsync(handle.fileno())
                self._write_new_json(metadata_path, metadata)
            except Exception:
                if upload_created:
                    upload_path.unlink(missing_ok=True)
                raise
        return metadata

    def update_dataset(self, dataset_id: str, updates: dict[str, Any]) -> dict[str, Any]:
        with self._lock:
            current = self.get_dataset(dataset_id)
            current.update(updates)
            self._write_json_atomic(self.dataset_metadata_path(dataset_id), current)
            return current

    def save_validation_report(
        self,
        dataset_id: str,
        report: dict[str, Any],
    ) -> None:
        self._write_json_atomic(
            self.validation_dir / f"{_validate_id(dataset_id)}.json",
            report,
        )

    def get_validation_report(self, dataset_id: str) -> dict[str, Any]:
        path = self.validation_dir / f"{_validate_id(dataset_id)}.json"
        if not path.is_file():
            raise ResourceNotFoundError("A validation report is not available.")
        return self._read_json(path)

    def save_feature_table(
        self,
        dataset_id: str,
        csv_content: str,
        metadata: dict[str, Any],
    ) -> None:
        identifier = _validate_id(dataset_id)
        path = self.features_dir / f"{identifier}.csv"
        self._write_text_atomic(path, csv_content)
        self._write_json_atomic(
            self.features_dir / f"{identifier}.json",
            metadata,
        )

    def create_experiment(self, metadata: dict[str, Any]) -> dict[str, Any]:
        experiment_id = _validate_id(metadata["experiment_id"])
        directory = self.experiment_dir(experiment_id)
        with self._lock:
            directory.mkdir(exist_ok=False)
            metadata_path = directory / "metadata.json"
            try:
                self._write_new_json(metadata_path, metadata)
            except Exception:
                metadata_path.unlink(missing_ok=True)
                directory.rmdir()
                raise
        return metadata

    def experiment_dir(self, experiment_id: str) -> Path:
        return self.experiments_dir / _validate_id(experiment_id)

    def get_experiment(self, experiment_id: str) -> dict[str, Any]:
        path = self.experiment_dir(experiment_id) / "metadata.json"
        if not path.is_file():
            raise ResourceNotFoundError("The requested experiment was not found.")
        return self._read_json(path)

    def list_experiments(self) -> list[dict[str, Any]]:
        experiments: list[dict[str, Any]] = []
        for directory in self.experiments_dir.iterdir():
            if directory.is_dir() and _RESOURCE_ID.fullmatch(directory.name):
                metadata_path = directory / "metadata.json"
                if metadata_path.is_file():
                    experiments.append(self._read_json(metadata_path))
        return sorted(experiments, key=lambda item: item["created_at"], reverse=True)

    def update_experiment(
        self,
        experiment_id: str,
        updates: dict[str, Any],
    ) -> dict[str, Any]:
        with self._lock:
            current = self.get_experiment(experiment_id)
            current.update(updates)
            self._write_json_atomic(
                self.experiment_dir(experiment_id) / "metadata.json",
                current,
            )
            return current

    def save_experiment_output(
        self,
        experiment_id: str,
        filename: str,
        content: str,
    ) -> None:
        if filename not in {"results.json", "predictions.csv", "report.json"}:
            raise ValueError("Unsupported experiment output name.")
        destination = self.experiment_dir(experiment_id) / filename
        self._write_new_text(destination, content)

    def get_experiment_output(self, experiment_id: str, filename: str) -> Path:
        if filename not in {"results.json", "predictions.csv", "report.json"}:
            raise ResourceNotFoundError("The requested experiment output was not found.")
        path = self.experiment_dir(experiment_id) / filename
        if not path.is_file():
            raise ResourceNotFoundError("The requested experiment output was not found.")
        return path

    @staticmethod
    def _read_json(path: Path) -> dict[str, Any]:
        try:
            value = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, UnicodeError, json.JSONDecodeError) as error:
            raise RuntimeError("Stored application metadata could not be read.") from error
        if not isinstance(value, dict):
            raise RuntimeError("Stored application metadata has an invalid shape.")
        return value

    @staticmethod
    def _write_new_json(path: Path, value: dict[str, Any]) -> None:
        with path.open("x", encoding="utf-8", newline="\n") as handle:
            json.dump(value, handle, ensure_ascii=True, indent=2, allow_nan=False)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())

    @classmethod
    def _write_json_atomic(cls, path: Path, value: dict[str, Any]) -> None:
        content = json.dumps(
            value,
            ensure_ascii=True,
            indent=2,
            allow_nan=False,
        ) + "\n"
        cls._write_text_atomic(path, content)

    @staticmethod
    def _write_text_atomic(path: Path, content: str) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary_path: Path | None = None
        try:
            with tempfile.NamedTemporaryFile(
                mode="w",
                encoding="utf-8",
                newline="\n",
                dir=path.parent,
                prefix=".tmp-",
                delete=False,
            ) as handle:
                temporary_path = Path(handle.name)
                handle.write(content)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temporary_path, path)
        except Exception:
            if temporary_path is not None:
                temporary_path.unlink(missing_ok=True)
            raise

    @staticmethod
    def _write_new_text(path: Path, content: str) -> None:
        with path.open("x", encoding="utf-8", newline="\n") as handle:
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
