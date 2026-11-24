"""Safe application exceptions and HTTP error serialization."""

from __future__ import annotations

import logging
import re

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


class ResourceNotFoundError(LookupError):
    """Raised when an application-owned resource does not exist."""


class UploadValidationError(ValueError):
    """Raised when uploaded content does not meet the CSV upload contract."""


class UploadTooLargeError(UploadValidationError):
    """Raised when an upload exceeds the configured byte limit."""


class UnsupportedUploadTypeError(UploadValidationError):
    """Raised when an upload does not use a supported file extension."""


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(ValueError)
    async def scientific_validation_handler(
        request: Request,
        error: ValueError,
    ) -> JSONResponse:
        message = str(error)
        storage = getattr(request.app.state, "storage", None)
        if storage is not None:
            root = str(storage.root)
            message = message.replace(root, "application storage")
            message = message.replace(root.replace("/", "\\"), "application storage")
        message = re.sub(r"[A-Za-z]:\\\\[^\\s,;]+", "application storage", message)
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "invalid_scientific_input",
                    "message": message or "The supplied scientific input is invalid.",
                }
            },
        )

    @app.exception_handler(HTTPException)
    async def http_error_handler(
        request: Request,
        error: HTTPException,
    ) -> JSONResponse:
        detail = error.detail
        message = detail if isinstance(detail, str) else "The request could not be completed."
        return JSONResponse(
            status_code=error.status_code,
            headers=error.headers,
            content={
                "error": {
                    "code": "request_error",
                    "message": message,
                }
            },
        )

    @app.exception_handler(RequestValidationError)
    async def request_validation_handler(
        request: Request,
        error: RequestValidationError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "validation_error",
                    "message": "The request contains invalid values.",
                    "details": [
                        {
                            "location": [str(part) for part in item["loc"]],
                            "message": item["msg"],
                        }
                        for item in error.errors()
                    ],
                }
            },
        )

    @app.exception_handler(ResourceNotFoundError)
    async def resource_not_found_handler(
        request: Request,
        error: ResourceNotFoundError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=404,
            content={"error": {"code": "not_found", "message": str(error)}},
        )

    @app.exception_handler(UploadValidationError)
    async def upload_validation_handler(
        request: Request,
        error: UploadValidationError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={"error": {"code": "invalid_upload", "message": str(error)}},
        )

    @app.exception_handler(UploadTooLargeError)
    async def upload_too_large_handler(
        request: Request,
        error: UploadTooLargeError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=413,
            content={"error": {"code": "upload_too_large", "message": str(error)}},
        )

    @app.exception_handler(UnsupportedUploadTypeError)
    async def unsupported_upload_handler(
        request: Request,
        error: UnsupportedUploadTypeError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=415,
            content={"error": {"code": "unsupported_upload_type", "message": str(error)}},
        )

    @app.exception_handler(Exception)
    async def unexpected_error_handler(
        request: Request,
        error: Exception,
    ) -> JSONResponse:
        logger.exception("Unhandled API exception for %s.", request.url.path)
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "internal_error",
                    "message": "The request could not be completed.",
                }
            },
        )
