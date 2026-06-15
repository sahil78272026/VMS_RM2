"""
Visitor Log Routes — /api/v1/visitor-logs
Core routes of the VMS — entry, approval, exit flows.
"""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.deps import get_current_user

from app.services.visitor_log_service import VisitorLogService
from app.repositories import FlatUserRepository, GuardRepository
from app.utils.response import success, error, not_found
from app.utils.exceptions import AppException

router = APIRouter(prefix="/api/v1/visitor-logs")


# ── Public — Visitor Self Check-In (no auth required) ─────────────────────

@router.post("/self-checkin")
async def self_checkin(request: Request, db: Session = Depends(get_db)):
    """
    Visitor registers themselves via QR code at the gate.
    No authentication required — public endpoint.
    Rate limited to prevent spam.
    """
    try:
        guard_repo = GuardRepository(db)
        flat_user_repo = FlatUserRepository(db)
        vl_service = VisitorLogService(db)
        data = await request.json()
        log  = vl_service.self_checkin(data)
        return success(
            "Check-in submitted. The resident has been notified. Please wait at the gate.",
            data=log.to_dict(),
            status_code=201
        )
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Self check-in failed", "SERVER_ERROR", str(e), 500)


# ── Guard Routes ───────────────────────────────────────────────────────────

@router.get("")
async def get_logs(request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """
    Guard: get today's logs for their assigned gate.
    Admin: get all logs with filters.
    """
    try:
        guard_repo = GuardRepository(db)
        vl_service = VisitorLogService(db)
        role = current_user.role

        if role == "guard":
            guard = guard_repo.get_by_user(current_user.id)
            if not guard:
                return error("Guard profile not found", "NOT_FOUND", status_code=404)
            from app.repositories import GateSessionRepository
            session_repo = GateSessionRepository(db)
            active = session_repo.get_active_by_guard(guard.id)
            gate_id = active.gate_id if active else 1
            logs = vl_service.get_today_for_gate(gate_id)
            return success("Visitor logs fetched", data=[l.to_dict() for l in logs])

        # Admin — filtered
        filters = {
            "status":    request.query_params.get("status"),
            "flat_id":   request.query_params.get("flat_id"),
            "from_date": request.query_params.get("from_date"),
            "to_date":   request.query_params.get("to_date"),
        }
        page     = int(request.query_params.get("page", 1))
        per_page = int(request.query_params.get("per_page", 20))
        result   = vl_service.get_all_filtered(filters, page, per_page)

        return success(
            "Visitor logs fetched",
            data=[l.to_dict() for l in result["items"]],
            meta=result["meta"]
        )
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to fetch logs", "SERVER_ERROR", str(e), 500)


@router.get("/pending")
async def get_pending(request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Guard: live feed of all pending approvals across the society."""
    try:
        from app.models import VisitorLog
        pending = db.query(VisitorLog).filter_by(approval_status="pending").all()
        return success("Pending approvals", data=[l.to_dict() for l in pending])
    except Exception as e:
        return error("Failed to fetch pending", "SERVER_ERROR", str(e), 500)


@router.get("/inside")
async def get_inside(request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Guard/Admin: all visitors currently inside the society."""
    try:
        guard_repo = GuardRepository(db)
        flat_user_repo = FlatUserRepository(db)
        vl_service = VisitorLogService(db)
        logs = vl_service.get_inside()
        return success("Visitors currently inside", data=[l.to_dict() for l in logs])
    except Exception as e:
        return error("Failed to fetch", "SERVER_ERROR", str(e), 500)


@router.post("")
async def create_log(request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Guard registers a new visitor at the gate."""
    try:
        guard_repo = GuardRepository(db)
        flat_user_repo = FlatUserRepository(db)
        vl_service = VisitorLogService(db)
        user_id = current_user.id
        guard   = guard_repo.get_by_user(user_id)
        if not guard:
            return error("Guard profile not found", "NOT_FOUND", status_code=404)

        data = await request.json()
        log  = vl_service.create_by_guard(guard.id, data)
        return success("Visitor registered and resident notified", data=log.to_dict(), status_code=201)
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to register visitor", "SERVER_ERROR", str(e), 500)


@router.patch("/{log_id}/entry")
async def confirm_entry(log_id: int, request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Guard confirms visitor has physically entered after approval."""
    try:
        guard_repo = GuardRepository(db)
        flat_user_repo = FlatUserRepository(db)
        vl_service = VisitorLogService(db)
        user_id = current_user.id
        guard   = guard_repo.get_by_user(user_id)
        data    = await request.json() or {}
        log     = vl_service.confirm_entry(log_id, guard.id, data)
        return success("Entry confirmed. Visitor is now inside.", data=log.to_dict())
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to confirm entry", "SERVER_ERROR", str(e), 500)


@router.patch("/{log_id}/exit")
async def confirm_exit(log_id: int, request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Guard marks a visitor as exited at the gate."""
    try:
        guard_repo = GuardRepository(db)
        flat_user_repo = FlatUserRepository(db)
        vl_service = VisitorLogService(db)
        user_id = current_user.id
        guard   = guard_repo.get_by_user(user_id)

        # Get guard's current gate
        active_session = guard.gate_sessions.filter_by(shift_end=None).first()
        gate_id        = active_session.gate_id if active_session else None

        log = vl_service.confirm_exit(log_id, confirmed_by="guard", gate_id=gate_id)
        return success("Exit confirmed. Visitor has left the society.", data=log.to_dict())
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to confirm exit", "SERVER_ERROR", str(e), 500)


# ── Resident Routes ────────────────────────────────────────────────────────

@router.get("/my")
async def get_my_logs(request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Resident: visitor history for their flat."""
    try:
        guard_repo = GuardRepository(db)
        flat_user_repo = FlatUserRepository(db)
        vl_service = VisitorLogService(db)
        user_id   = current_user.id
        flat_user = flat_user_repo.get_by_user(user_id)
        if not flat_user:
            return error("Flat not found for this resident", "NOT_FOUND", status_code=404)

        page     = int(request.query_params.get("page", 1))
        per_page = int(request.query_params.get("per_page", 20))
        result   = vl_service.get_by_flat(flat_user.flat_id, page, per_page)

        return success(
            "Visitor history fetched",
            data=[l.to_dict() for l in result["items"]],
            meta=result["meta"]
        )
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to fetch history", "SERVER_ERROR", str(e), 500)


@router.get("/my/pending")
async def get_my_pending(request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Resident: pending approvals for their flat."""
    try:
        guard_repo = GuardRepository(db)
        flat_user_repo = FlatUserRepository(db)
        vl_service = VisitorLogService(db)
        user_id   = current_user.id
        flat_user = flat_user_repo.get_by_user(user_id)
        if not flat_user:
            return error("Flat not found", "NOT_FOUND", status_code=404)

        logs = vl_service.get_pending_for_flat(flat_user.flat_id)
        return success("Pending approvals", data=[l.to_dict() for l in logs])
    except Exception as e:
        return error("Failed to fetch", "SERVER_ERROR", str(e), 500)


@router.patch("/{log_id}/approve")
async def approve(log_id: int, request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Resident approves a visitor entry request."""
    try:
        guard_repo = GuardRepository(db)
        flat_user_repo = FlatUserRepository(db)
        vl_service = VisitorLogService(db)
        user_id   = current_user.id
        flat_user = flat_user_repo.get_by_user(user_id)
        if not flat_user:
            return error("Flat not found", "NOT_FOUND", status_code=404)

        log = vl_service.approve(log_id, flat_user.id)
        return success("Visitor approved. Guard has been notified.", data=log.to_dict())
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to approve", "SERVER_ERROR", str(e), 500)


@router.patch("/{log_id}/deny")
async def deny(log_id: int, request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Resident denies a visitor entry request."""
    try:
        guard_repo = GuardRepository(db)
        flat_user_repo = FlatUserRepository(db)
        vl_service = VisitorLogService(db)
        user_id   = current_user.id
        flat_user = flat_user_repo.get_by_user(user_id)
        if not flat_user:
            return error("Flat not found", "NOT_FOUND", status_code=404)

        log = vl_service.deny(log_id, flat_user.id)
        return success("Visitor denied.", data=log.to_dict())
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to deny", "SERVER_ERROR", str(e), 500)


@router.patch("/{log_id}/confirm-departure")
async def confirm_departure(log_id: int, request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Resident confirms their guest has left — without gate scan."""
    try:
        guard_repo = GuardRepository(db)
        flat_user_repo = FlatUserRepository(db)
        vl_service = VisitorLogService(db)
        user_id   = current_user.id
        flat_user = flat_user_repo.get_by_user(user_id)
        if not flat_user:
            return error("Flat not found", "NOT_FOUND", status_code=404)

        log = vl_service.confirm_departure_by_resident(log_id, flat_user.id)
        return success("Departure confirmed.", data=log.to_dict())
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to confirm departure", "SERVER_ERROR", str(e), 500)


# ── Admin Routes ───────────────────────────────────────────────────────────

@router.get("/overdue")
async def get_overdue(request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Admin: all overdue visitors currently inside."""
    try:
        guard_repo = GuardRepository(db)
        flat_user_repo = FlatUserRepository(db)
        vl_service = VisitorLogService(db)
        logs = vl_service.get_overdue()
        return success("Overdue visitors", data=[l.to_dict() for l in logs])
    except Exception as e:
        return error("Failed to fetch", "SERVER_ERROR", str(e), 500)
