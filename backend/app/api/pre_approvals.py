"""
Pre Approvals Routes — /api/v1/pre-approvals
Residents pre-authorise expected guests.
Guards check pre-approvals at the gate.
"""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.deps import get_current_user

from app.services.pre_approval_service import PreApprovalService
from app.repositories import FlatUserRepository
from app.utils.response import success, error
from app.utils.exceptions import AppException



router = APIRouter(prefix="/api/v1/pre-approvals", tags=["pre-approvals"])

@router.get("/my")
async def get_my_pre_approvals(request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Resident: list all their pre-approvals."""
    try:
        flat_user_repo = FlatUserRepository(db)
        pre_approval_service = PreApprovalService(db)
        user_id   = current_user.id
        flat_user = flat_user_repo.get_by_user(user_id)
        if not flat_user:
            return error("Flat not found", "NOT_FOUND", status_code=404)

        pre_approvals = pre_approval_service.get_by_flat_user(flat_user.id)
        return success("Pre-approvals fetched", data=[p.to_dict() for p in pre_approvals])
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to fetch pre-approvals", "SERVER_ERROR", str(e), 500)


@router.post("")
async def create_pre_approval(request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Resident: pre-approve an expected guest."""
    try:
        flat_user_repo = FlatUserRepository(db)
        pre_approval_service = PreApprovalService(db)
        user_id   = current_user.id
        flat_user = flat_user_repo.get_by_user(user_id)
        if not flat_user:
            return error("Flat not found", "NOT_FOUND", status_code=404)

        data         = await request.json()
        pre_approval = pre_approval_service.create(flat_user.id, data)
        return success("Guest pre-approved successfully", data=pre_approval.to_dict(), status_code=201)
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to create pre-approval", "SERVER_ERROR", str(e), 500)


@router.patch("/{pre_approval_id}")
async def update_pre_approval(pre_approval_id: int, request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Resident: update a pre-approval time window or details."""
    try:
        flat_user_repo = FlatUserRepository(db)
        pre_approval_service = PreApprovalService(db)
        user_id      = current_user.id
        flat_user    = flat_user_repo.get_by_user(user_id)
        data         = await request.json()
        pre_approval = pre_approval_service.update(flat_user.id, pre_approval_id, data)
        return success("Pre-approval updated", data=pre_approval.to_dict())
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to update pre-approval", "SERVER_ERROR", str(e), 500)


@router.delete("/{pre_approval_id}")
async def cancel_pre_approval(pre_approval_id: int, request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Resident: cancel a pre-approval."""
    try:
        flat_user_repo = FlatUserRepository(db)
        pre_approval_service = PreApprovalService(db)
        user_id   = current_user.id
        flat_user = flat_user_repo.get_by_user(user_id)
        pre_approval_service.cancel(flat_user.id, pre_approval_id)
        return success("Pre-approval cancelled")
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to cancel pre-approval", "SERVER_ERROR", str(e), 500)


@router.get("/check")
async def check_pre_approval(request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """
    Guard: check if a visitor has a valid pre-approval for a flat.
    Query params: ?phone=&flat_id=
    Used at gate before creating a full visitor log.
    """
    try:
        flat_user_repo = FlatUserRepository(db)
        pre_approval_service = PreApprovalService(db)
        phone   = request.query_params.get("phone")
        flat_id = request.query_params.get("flat_id")

        if not phone or not flat_id:
            return error("phone and flat_id are required", "VALIDATION_ERROR", status_code=400)

        result = pre_approval_service.check(phone, int(flat_id))
        if result:
            return success("Valid pre-approval found", data=result.to_dict())
        return success("No pre-approval found", data=None)
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to check pre-approval", "SERVER_ERROR", str(e), 500)
