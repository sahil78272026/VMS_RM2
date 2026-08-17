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
from app.api.deps import get_active_society_id, get_current_user
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
        header_society_id = request.headers.get("X-Society-ID")
        target_society_id = society_id or (int(header_society_id) if header_society_id and header_society_id.isdigit() else None)

        if not target_society_id:
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                try:
                    raw_token = auth_header.split(" ")[1]
                    payload = jwt.decode(raw_token, JWT_SECRET_KEY, algorithms=[ALGORITHM])
                    target_society_id = payload.get("active_society_id")
                except Exception:
                    pass

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
async def create_flat(
    request: Request,
    db: Session = Depends(get_db),
    society_id: int = Depends(get_active_society_id)
):
    """Admin: create a single flat in a society."""
    try:
        flat_service = FlatService(db)
        data = await request.json()
        data["society_id"] = society_id
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

@router.patch("/{flat_id}/settings")
async def update_flat_settings(flat_id: int, request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Allow primary residents to update flat-specific settings."""
    from app.repositories import FlatUserRepository, FlatRepository
    
    fu_repo = FlatUserRepository(db)
    flat_user = fu_repo.get_by_user(current_user.id)
    if not flat_user or flat_user.flat_id != flat_id or flat_user.role != "primary":
        return error("Only primary residents can update flat settings", "FORBIDDEN", status_code=403)
        
    data = await request.json()
    flat_repo = FlatRepository(db)
    flat = flat_repo.get_by_id(flat_id)
    
    if "allow_guard_force_entry" in data:
        flat.allow_guard_force_entry = data["allow_guard_force_entry"]
        flat_repo.save(flat)
        
    return success("Flat settings updated", data=flat.to_dict())
