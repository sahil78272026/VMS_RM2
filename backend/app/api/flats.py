"""
Flats Routes — /api/v1/flats

Endpoints:
  GET   /api/v1/flats              → All roles: list flats by society
  POST  /api/v1/flats              → Admin: create flat in society
  GET   /api/v1/flats/:id          → Any role: single flat detail
  PATCH /api/v1/flats/:id/status   → Admin only: update occupied/vacant
"""

from fastapi import APIRouter, Depends, Request, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.api.deps import extract_society_id_from_request
from app.services.flat_service import FlatService
from app.utils.response import success, error
from app.utils.exceptions import AppException


from app.utils.security import JWT_SECRET_KEY, ALGORITHM
import jwt


router = APIRouter(prefix="/api/v1/flats", tags=["flats"])


@router.get("")
async def get_all_flats(
    request: Request,
    society_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1),
    per_page: int = Query(100),
    db: Session = Depends(get_db)
):
    """
    All roles: list all flats for a society.
    Residents use this for the flat selection dropdown on registration.
    Query: ?society_id=1&status=occupied|vacant&page=1&per_page=100
    """
    try:
        flat_service = FlatService(db)
        target_society_id = extract_society_id_from_request(request, society_id)

        result = flat_service.get_all(society_id=target_society_id, status=status, page=page, per_page=per_page)
        return success(
            "Flats fetched",
            data=[f.to_dict() for f in result["items"]],
            meta=result["meta"]
        )
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to fetch flats", "SERVER_ERROR", str(e), 500)


@router.post("")
async def create_flat(request: Request, db: Session = Depends(get_db)):
    """Admin: create a single flat in a society."""
    try:
        flat_service = FlatService(db)
        data = await request.json()
        flat = flat_service.create(data)
        return success("Flat created", data=flat.to_dict(), status_code=201)
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to create flat", "SERVER_ERROR", str(e), 500)


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
