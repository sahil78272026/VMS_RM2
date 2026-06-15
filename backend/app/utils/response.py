import logging
logger = logging.getLogger(__name__)
from typing import Any, Optional, Union


def success(
    message: str,
    data: Any = None,
    status_code: int = 200,
    meta: Optional[dict] = None
):
    """
    Standard success response.

    Shape:
    {
        "success": true,
        "message": "...",
        "data": { } | [ ] | null,
        "error": null
    }

    With pagination meta, data becomes:
    {
        "items": [...],
        "meta": { "page": 1, "per_page": 20, "total": 143, "pages": 8 }
    }
    """
    payload = {
        "success": True,
        "message": message,
        "data":    {"items": data, "meta": meta} if meta else data,
        "error":   None,
    }
    return JSONResponse(status_code=status_code, content=payload)


from fastapi.responses import JSONResponse

def error(
    message: str,
    code: str,
    details: Union[str, dict, None] = None,
    status_code: int = 400
):
    """
    Standard error response.

    Shape:
    {
        "success": false,
        "message": "...",
        "data": null,
        "error": {
            "code": "VALIDATION_ERROR",
            "details": "..." | { "field": "reason" }
        }
    }
    """
    payload = {
        "success": False,
        "message": message,
        "data":    None,
        "error": {
            "code":    code,
            "details": details,
        },
    }
    return JSONResponse(status_code=status_code, content=payload)


# ── Shorthand helpers ──────────────────────────────────────────────────────

def not_found(resource: str = "Resource"):
    return error(f"{resource} not found", code="NOT_FOUND", status_code=404)

def forbidden(message: str = "Access denied"):
    return error(message, code="FORBIDDEN", status_code=403)

def unauthorized(message: str = "Unauthorized"):
    return error(message, code="UNAUTHORIZED", status_code=401)

def validation_error(details: Union[str, dict]):
    return error("Validation failed", code="VALIDATION_ERROR", details=details, status_code=400)

def conflict(message: str, details: str = None):
    return error(message, code="CONFLICT", details=details, status_code=409)

def server_error(message: str = "Something went wrong"):
    return error(message, code="SERVER_ERROR", status_code=500)
