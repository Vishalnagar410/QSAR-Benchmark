"""Health and software-version endpoints."""

from __future__ import annotations

import importlib.metadata
import sys

import numpy as np
import sklearn
from fastapi import APIRouter
from backend.app.schemas.api import HealthResponse, VersionResponse
from rdkit import rdBase

router = APIRouter(tags=["health"])


def _application_version() -> str:
    try:
        return importlib.metadata.version("qsar-benchmark")
    except importlib.metadata.PackageNotFoundError:
        return "0.1.0"


@router.get("/health", response_model=HealthResponse)
def health() -> dict[str, str]:
    return {"status": "ok", "application_version": _application_version()}


@router.get("/version", response_model=VersionResponse)
def version() -> dict[str, str]:
    return {
        "application_version": _application_version(),
        "python_version": sys.version.split()[0],
        "rdkit_version": rdBase.rdkitVersion,
        "numpy_version": np.__version__,
        "scikit_learn_version": sklearn.__version__,
    }
