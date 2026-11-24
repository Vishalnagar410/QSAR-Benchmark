"""FastAPI application entry point."""

from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.routes.datasets import router as datasets_router
from backend.app.api.routes.experiments import router as experiments_router
from backend.app.api.routes.health import router as health_router
from backend.app.core.config import Settings
from backend.app.core.exceptions import register_exception_handlers
from backend.app.core.storage import LocalStorage
from backend.app.services.experiments import ExperimentRunner


def create_app(
    *,
    storage_dir: str | Path | None = None,
    max_upload_bytes: int | None = None,
    cors_origins: tuple[str, ...] | None = None,
) -> FastAPI:
    settings = Settings.from_environment()
    selected_storage_dir = (
        settings.storage_dir if storage_dir is None else Path(storage_dir)
    )
    selected_max_upload_bytes = (
        settings.max_upload_bytes
        if max_upload_bytes is None
        else max_upload_bytes
    )
    selected_cors_origins = settings.cors_origins if cors_origins is None else cors_origins
    if selected_max_upload_bytes < 1:
        raise ValueError("Maximum upload size must be positive.")
    if not selected_cors_origins:
        raise ValueError("At least one explicit CORS origin is required.")

    storage = LocalStorage(selected_storage_dir)
    runner = ExperimentRunner(storage)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        yield
        runner.shutdown()

    app = FastAPI(
        title="QSAR-Benchmark API",
        description=(
            "Local API for the existing validated QSAR data and baseline "
            "regression engine."
        ),
        version="0.1.0",
        lifespan=lifespan,
    )
    app.state.storage = storage
    app.state.experiment_runner = runner
    app.state.max_upload_bytes = selected_max_upload_bytes
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(selected_cors_origins),
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )
    register_exception_handlers(app)
    app.include_router(health_router, prefix="/api")
    app.include_router(datasets_router, prefix="/api")
    app.include_router(experiments_router, prefix="/api")
    return app


app = create_app()
