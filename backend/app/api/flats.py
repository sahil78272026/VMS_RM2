"""
Flats Routes — /api/v1/flats

Flats are SEEDED at setup — never created or deleted via API.
Flat numbers (1, 1A, 1B, 2, 2A...) are fixed for RM2 Residency.

Endpoints:
  GET   /api/v1/flats              → All roles: dropdown during registration
  GET   /api/v1/flats/:id          → Any role: single flat detail
  PATCH /api/v1/flats/:id/status   → Admin only: update occupied/vacant
"""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.deps import get_current_user

from app.services.flat_service import FlatService
from app.utils.response import success, error
from app.utils.exceptions import AppException



router = APIRouter(prefix="/api/v1/flats", tags=["flats"])

@router.get("")
async def get_all_flats(request: Request, db: Session = Depends(get_db)):
    """
    All roles: list all flats.
    Residents use this for the flat selection dropdown on registration.
    Query: ?status=occupied|vacant  &page=  &per_page=100
    """
    try:
        flat_service = FlatService(db)
        status   = request.query_params.get("status")
        page     = int(request.query_params.get("page", 1))
        per_page = int(request.query_params.get("per_page", 100))
        result   = flat_service.get_all(status=status, page=page, per_page=per_page)
        return success(
            "Flats fetched",
            data=[f.to_dict() for f in result["items"]],
            meta=result["meta"]
        )
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to fetch flats", "SERVER_ERROR", str(e), 500)


@router.get("/{flat_id}")
async def get_flat(flat_id: int, request: Request, db: Session = Depends(get_db)):
    """All roles: get a single flat's details."""
    try:
        flat_service = FlatService(db)
        flat = flat_service.get_by_id(flat_id)
        return success("Flat fetched", data=flat.to_dict())
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to fetch flat", "SERVER_ERROR", str(e), 500)


@router.patch("/{flat_id}/status")
async def update_flat_status(flat_id: int, request: Request, db: Session = Depends(get_db)):
    """
    Admin: update flat status only — occupied | vacant.
    This is the ONLY write operation on flats via API.
    Flat numbers are seeded at setup and never changed.
    """
    try:
        flat_service = FlatService(db)
        data   = await request.json()
        status = data.get("status")
        if status not in ("occupied", "vacant"):
            return error(
                "Invalid status. Must be 'occupied' or 'vacant'",
                "VALIDATION_ERROR",
                status_code=400
            )
        flat = flat_service.update_status(flat_id, status)
        return success("Flat status updated", data=flat.to_dict())
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to update flat status", "SERVER_ERROR", str(e), 500)
