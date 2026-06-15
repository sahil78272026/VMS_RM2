"""
Flat Users Routes — /api/v1/flat-users
Manages primary residents and family members of a flat.
"""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.deps import get_current_user

from app.services.flat_user_service import FlatUserService
from app.utils.response import success, error
from app.utils.exceptions import AppException



router = APIRouter(prefix="/api/v1/flat-users", tags=["flat-users"])

@router.get("")
async def get_all_flat_users(request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Admin: list all flat-user assignments."""
    try:
        flat_user_service = FlatUserService(db)
        from app.models import FlatUser
        flat_users = db.query(FlatUser).all()
        return success("Flat users fetched", data=[fu.to_dict() for fu in flat_users])
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to fetch flat users", "SERVER_ERROR", str(e), 500)

@router.get("/my-flat")
async def get_my_flat(request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Resident: get all members of their own flat."""
    try:
        flat_user_service = FlatUserService(db)
        user_id = current_user.id
        members = flat_user_service.get_flat_members(user_id)
        return success("Flat members fetched", data=[m.to_dict() for m in members])
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to fetch flat members", "SERVER_ERROR", str(e), 500)


@router.post("")
async def add_primary_resident(request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """
    Admin: assign a primary resident to a flat.
    Called when admin registers a new resident after verification.
    """
    try:
        flat_user_service = FlatUserService(db)
        data        = await request.json()
        flat_user   = flat_user_service.add_primary(data)
        return success("Primary resident added to flat", data=flat_user.to_dict(), status_code=201)
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to add resident", "SERVER_ERROR", str(e), 500)


@router.post("/member")
async def add_family_member(request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """
    Resident: add a family member to their flat.
    Family member gets their own login account.
    """
    try:
        flat_user_service = FlatUserService(db)
        user_id   = current_user.id
        data      = await request.json()
        flat_user = flat_user_service.add_member(user_id, data)
        return success("Family member added", data=flat_user.to_dict(), status_code=201)
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to add family member", "SERVER_ERROR", str(e), 500)


@router.patch("/{flat_user_id}")
async def update_member(flat_user_id: int, request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Resident/Admin: update a flat member's details or permissions."""
    try:
        flat_user_service = FlatUserService(db)
        user_id   = current_user.id
        data      = await request.json()
        flat_user = flat_user_service.update_member(user_id, flat_user_id, data)
        return success("Member updated", data=flat_user.to_dict())
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to update member", "SERVER_ERROR", str(e), 500)


@router.delete("/{flat_user_id}")
async def remove_member(flat_user_id: int, request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Resident/Admin: remove a family member from the flat."""
    try:
        flat_user_service = FlatUserService(db)
        user_id = current_user.id
        flat_user_service.remove_member(user_id, flat_user_id)
        return success("Member removed from flat")
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to remove member", "SERVER_ERROR", str(e), 500)


@router.patch("/{flat_user_id}/promote")
async def promote_to_primary(flat_user_id: int, request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Primary resident: promote a family member to primary (can approve visitors)."""
    try:
        flat_user_service = FlatUserService(db)
        flat_user = flat_user_service.promote_to_primary(current_user.id, flat_user_id)
        return success("Member promoted to primary", data=flat_user.to_dict())
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to promote member", "SERVER_ERROR", str(e), 500)


@router.patch("/{flat_user_id}/demote")
async def demote_from_primary(flat_user_id: int, request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Primary resident: demote another primary member back to secondary."""
    try:
        flat_user_service = FlatUserService(db)
        flat_user = flat_user_service.demote_from_primary(current_user.id, flat_user_id)
        return success("Member demoted to secondary", data=flat_user.to_dict())
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to demote member", "SERVER_ERROR", str(e), 500)
