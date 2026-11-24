"""Environment-backed settings for the local API."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    storage_dir: Path
    max_upload_bytes: int
    cors_origins: tuple[str, ...]

    @classmethod
    def from_environment(cls) -> Settings:
        storage_path = Path(
            os.environ.get(
                "QSAR_BENCHMARK_DATA_DIR",
                str(Path.cwd() / "data"),
            )
        )
        try:
            max_upload_bytes = int(
                os.environ.get("QSAR_BENCHMARK_MAX_UPLOAD_BYTES", str(10 * 1024 * 1024))
            )
        except ValueError as error:
            raise ValueError(
                "QSAR_BENCHMARK_MAX_UPLOAD_BYTES must be an integer."
            ) from error
        if max_upload_bytes < 1:
            raise ValueError("Maximum upload size must be positive.")
        return cls(
            storage_dir=storage_path,
            max_upload_bytes=max_upload_bytes,
            cors_origins=(
                "http://localhost:5173",
                "http://127.0.0.1:5173",
            ),
        )
