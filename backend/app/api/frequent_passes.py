"""
Frequent Passes Routes — /api/v1/frequent-passes
Residents manage passes for daily staff like maids and drivers.
Guards verify passes at the gate.
"""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.deps import get_current_user

from app.services.frequent_pass_service import FrequentPassService
from app.repositories import FlatUserRepository
from app.utils.response import success, error
from app.utils.exceptions import AppException



router = APIRouter(prefix="/api/v1/frequent-passes", tags=["frequent-passes"])

@router.get("/my")
async def get_my_passes(request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Resident: list all their frequent passes."""
    try:
        flat_user_repo = FlatUserRepository(db)
        frequent_pass_service = FrequentPassService(db)
        user_id   = current_user.id
        flat_user = flat_user_repo.get_by_user(user_id)
        if not flat_user:
            return error("Flat not found", "NOT_FOUND", status_code=404)

        passes = frequent_pass_service.get_by_flat_user(flat_user.id)
        return success("Frequent passes fetched", data=[p.to_dict() for p in passes])
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to fetch passes", "SERVER_ERROR", str(e), 500)


@router.post("")
async def create_pass(request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """
    Resident: create a frequent pass for daily staff.
    e.g. Maid allowed Mon-Fri 8AM-10AM indefinitely.
    """
    try:
        flat_user_repo = FlatUserRepository(db)
        frequent_pass_service = FrequentPassService(db)
        user_id   = current_user.id
        flat_user = flat_user_repo.get_by_user(user_id)
        if not flat_user:
            return error("Flat not found", "NOT_FOUND", status_code=404)

        data       = await request.json()
        freq_pass  = frequent_pass_service.create(flat_user.id, data)
        return success("Frequent pass created", data=freq_pass.to_dict(), status_code=201)
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to create pass", "SERVER_ERROR", str(e), 500)


@router.patch("/{pass_id}")
async def update_pass(pass_id: int, request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Resident: update pass details or time window."""
    try:
        flat_user_repo = FlatUserRepository(db)
        frequent_pass_service = FrequentPassService(db)
        user_id   = current_user.id
        flat_user = flat_user_repo.get_by_user(user_id)
        data      = await request.json()
        freq_pass = frequent_pass_service.update(flat_user.id, pass_id, data)
        return success("Pass updated", data=freq_pass.to_dict())
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to update pass", "SERVER_ERROR", str(e), 500)


@router.patch("/{pass_id}/suspend")
async def suspend_pass(pass_id: int, request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """
    Resident: temporarily suspend a pass.
    e.g. maid is on leave for a week.
    """
    try:
        flat_user_repo = FlatUserRepository(db)
        frequent_pass_service = FrequentPassService(db)
        user_id   = current_user.id
        flat_user = flat_user_repo.get_by_user(user_id)
        freq_pass = frequent_pass_service.suspend(flat_user.id, pass_id)
        return success("Pass suspended", data=freq_pass.to_dict())
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to suspend pass", "SERVER_ERROR", str(e), 500)


@router.patch("/{pass_id}/activate")
async def activate_pass(pass_id: int, request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Resident: reactivate a suspended pass."""
    try:
        flat_user_repo = FlatUserRepository(db)
        frequent_pass_service = FrequentPassService(db)
        user_id   = current_user.id
        flat_user = flat_user_repo.get_by_user(user_id)
        freq_pass = frequent_pass_service.activate(flat_user.id, pass_id)
        return success("Pass activated", data=freq_pass.to_dict())
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to activate pass", "SERVER_ERROR", str(e), 500)


@router.delete("/{pass_id}")
async def delete_pass(pass_id: int, request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Resident: permanently remove a frequent pass."""
    try:
        flat_user_repo = FlatUserRepository(db)
        frequent_pass_service = FrequentPassService(db)
        user_id   = current_user.id
        flat_user = flat_user_repo.get_by_user(user_id)
        frequent_pass_service.delete(flat_user.id, pass_id)
        return success("Pass removed")
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to remove pass", "SERVER_ERROR", str(e), 500)


@router.get("/check")
async def check_pass(request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """
    Guard: verify if a frequent pass is valid right now.
    Query params: ?phone=&flat_id=
    Checks: pass active, today's day allowed, current time within window.
    """
    try:
        flat_user_repo = FlatUserRepository(db)
        frequent_pass_service = FrequentPassService(db)
        phone   = request.query_params.get("phone")
        flat_id = request.query_params.get("flat_id")

        if not phone or not flat_id:
            return error("phone and flat_id are required", "VALIDATION_ERROR", status_code=400)

        result = frequent_pass_service.check(phone, int(flat_id))
        if result:
            return success("Valid pass found — entry allowed", data=result.to_dict())
        return success("No valid pass found for today", data=None)
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to check pass", "SERVER_ERROR", str(e), 500)
