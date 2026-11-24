"""FastAPI dependencies for application-owned services."""

from fastapi import Request

from backend.app.core.storage import LocalStorage
from backend.app.services.experiments import ExperimentRunner


def get_storage(request: Request) -> LocalStorage:
    return request.app.state.storage


def get_experiment_runner(request: Request) -> ExperimentRunner:
    return request.app.state.experiment_runner
