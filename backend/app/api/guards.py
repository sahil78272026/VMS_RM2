"""
Guards Routes — /api/v1/guards
Admin manages guard accounts. Guards can view their own profile.
"""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.deps import get_current_user

from app.services.guard_service import GuardService
from app.utils.response import success, error
from app.utils.exceptions import AppException



router = APIRouter(prefix="/api/v1/guards", tags=["guards"])

@router.get("")
async def get_all_guards(request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Admin: list all guards."""
    try:
        guard_service = GuardService(db)
        guards = guard_service.get_all()
        return success("Guards fetched", data=[g.to_dict() for g in guards])
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to fetch guards", "SERVER_ERROR", str(e), 500)


@router.get("/me")
async def get_my_profile(request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Guard: get own profile and current shift details."""
    try:
        guard_service = GuardService(db)
        user_id = current_user.id
        guard   = guard_service.get_by_user(user_id)
        return success("Guard profile fetched", data=guard.to_dict())
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to fetch profile", "SERVER_ERROR", str(e), 500)


@router.get("/{guard_id}")
async def get_guard(guard_id: int, request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Admin: get a specific guard's details."""
    try:
        guard_service = GuardService(db)
        guard = guard_service.get_by_id(guard_id)
        return success("Guard fetched", data=guard.to_dict())
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to fetch guard", "SERVER_ERROR", str(e), 500)


@router.post("")
async def create_guard(request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """
    Admin: create a new guard account.
    Creates a user record with role=guard and a guard profile.
    """
    try:
        guard_service = GuardService(db)
        data  = await request.json()
        guard = guard_service.create(data)
        return success("Guard account created", data=guard.to_dict(), status_code=201)
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to create guard", "SERVER_ERROR", str(e), 500)


@router.patch("/{guard_id}")
async def update_guard(guard_id: int, request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Admin: update guard shift or employee ID."""
    try:
        guard_service = GuardService(db)
        data  = await request.json()
        guard = guard_service.update(guard_id, data)
        return success("Guard updated", data=guard.to_dict())
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to update guard", "SERVER_ERROR", str(e), 500)


@router.delete("/{guard_id}")
async def deactivate_guard(guard_id: int, request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Admin: deactivate a guard account."""
    try:
        guard_service = GuardService(db)
        guard_service.deactivate(guard_id)
        return success("Guard account deactivated")
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to deactivate guard", "SERVER_ERROR", str(e), 500)
