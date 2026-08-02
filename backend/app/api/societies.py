from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.services.society_service import SocietyService
from app.schemas.society import (
    CreateSocietyRequest, UpdateSocietyRequest,
    BatchCreateFlatsRequest, AssignAdminRequest
)
from app.api.deps import (
    get_current_user, active_account_required,
    require_super_admin, require_society_admin
)
from app.models import User

router = APIRouter(prefix="/api/v1/societies", tags=["Societies"])


@router.get("")
def list_societies(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    service = SocietyService(db)
    societies = service.get_all(status=status)
    return {
        "success": True,
        "message": "Societies retrieved",
        "data": [s.to_dict() for s in societies],
        "error": None
    }


@router.post("")
def create_society(
    data: CreateSocietyRequest,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    service = SocietyService(db)
    society = service.create(data.dict())
    return {
        "success": True,
        "message": f"Society '{society.name}' created successfully",
        "data": society.to_dict(),
        "error": None
    }


@router.get("/{society_id}")
def get_society(
    society_id: int,
    db: Session = Depends(get_db)
):
    service = SocietyService(db)
    society = service.get_by_id(society_id)
    return {
        "success": True,
        "message": "Society details retrieved",
        "data": society.to_dict(),
        "error": None
    }


@router.put("/{society_id}")
def update_society(
    society_id: int,
    data: UpdateSocietyRequest,
    current_user: User = Depends(active_account_required),
    db: Session = Depends(get_db)
):
    # Super admin or society admin can update
    service = SocietyService(db)
    if not (current_user.is_super_admin or current_user.role == "super_admin"):
        from app.repositories import SocietyAdminRepository
        if not SocietyAdminRepository(db).is_admin(society_id, current_user.id):
            from fastapi import HTTPException
            raise HTTPException(status_code=403, detail="Admin privileges required for this society")

    updated = service.update(society_id, data.dict(exclude_unset=True))
    return {
        "success": True,
        "message": "Society updated successfully",
        "data": updated.to_dict(),
        "error": None
    }


@router.get("/{society_id}/stats")
def get_society_stats(
    society_id: int,
    current_user: User = Depends(active_account_required),
    db: Session = Depends(get_db)
):
    service = SocietyService(db)
    stats = service.get_stats(society_id)
    return {
        "success": True,
        "message": "Society stats retrieved",
        "data": stats,
        "error": None
    }


@router.post("/{society_id}/batch-flats")
def batch_create_flats(
    society_id: int,
    data: BatchCreateFlatsRequest,
    current_user: User = Depends(active_account_required),
    db: Session = Depends(get_db)
):
    service = SocietyService(db)
    if not (current_user.is_super_admin or current_user.role == "super_admin"):
        from app.repositories import SocietyAdminRepository
        if not SocietyAdminRepository(db).is_admin(society_id, current_user.id):
            from fastapi import HTTPException
            raise HTTPException(status_code=403, detail="Admin privileges required for this society")

    flats = service.batch_create_flats(society_id, data.dict())
    return {
        "success": True,
        "message": f"Successfully created {len(flats)} flats",
        "data": flats,
        "error": None
    }


@router.get("/{society_id}/admins")
def list_society_admins(
    society_id: int,
    current_user: User = Depends(active_account_required),
    db: Session = Depends(get_db)
):
    service = SocietyService(db)
    admins = service.get_society_admins(society_id)
    return {
        "success": True,
        "message": "Society admins retrieved",
        "data": [a.to_dict() for a in admins],
        "error": None
    }


@router.post("/{society_id}/admins")
def assign_society_admin(
    society_id: int,
    data: AssignAdminRequest,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    service = SocietyService(db)
    assignment = service.assign_admin(society_id, data.user_id)
    return {
        "success": True,
        "message": f"User {data.user_id} assigned as admin of society {society_id}",
        "data": assignment.to_dict(),
        "error": None
    }


@router.delete("/{society_id}/admins/{user_id}")
def remove_society_admin(
    society_id: int,
    user_id: int,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    service = SocietyService(db)
    service.remove_admin(society_id, user_id)
    return {
        "success": True,
        "message": f"User {user_id} removed from society {society_id} admins",
        "data": None,
        "error": None
    }
