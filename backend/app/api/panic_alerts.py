"""
Panic Alerts Routes — /api/v1/panic-alerts
Guards and residents trigger panic. Admin resolves.
"""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.deps import get_current_user

from app.services.panic_alert_service import PanicAlertService
from app.repositories import GuardRepository, FlatUserRepository
from app.utils.response import success, error
from app.utils.exceptions import AppException



router = APIRouter(prefix="/api/v1/panic-alerts", tags=["panic-alerts"])

@router.post("")
async def trigger_panic(request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """
    Guard or Resident: trigger a panic alert.
    Instantly notifies all admins via push + SMS.
    Guard alerts are gate-level. Resident alerts are flat-level.
    """
    try:
        flat_user_repo = FlatUserRepository(db)
        guard_repo = GuardRepository(db)
        panic_service = PanicAlertService(db)
        user_id = current_user.id
        claims  = get_jwt()
        role    = claims.get("role")
        data    = await request.json() or {}

        gate_id = None
        flat_id = None

        if role == "guard":
            guard   = guard_repo.get_by_user(user_id)
            session = guard.gate_sessions.filter_by(shift_end=None).first() if guard else None
            gate_id = session.gate_id if session else None

        elif role == "resident":
            flat_user = flat_user_repo.get_by_user(user_id)
            flat_id   = flat_user.flat_id if flat_user else None

        alert = panic_service.trigger(
            user_id = user_id,
            role    = role,
            gate_id = gate_id,
            flat_id = flat_id,
            message = data.get("message"),
        )
        return success("🚨 Panic alert triggered. Help is on the way.", data=alert.to_dict(), status_code=201)
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to trigger panic", "SERVER_ERROR", str(e), 500)


@router.get("")
async def get_all_alerts(request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Admin: list all panic alerts with filters."""
    try:
        flat_user_repo = FlatUserRepository(db)
        guard_repo = GuardRepository(db)
        panic_service = PanicAlertService(db)
        status   = request.query_params.get("status")        # active | resolved
        page     = int(request.query_params.get("page", 1))
        per_page = int(request.query_params.get("per_page", 20))
        result   = panic_service.get_all(status=status, page=page, per_page=per_page)
        return success(
            "Panic alerts fetched",
            data=[a.to_dict() for a in result["items"]],
            meta=result["meta"]
        )
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to fetch alerts", "SERVER_ERROR", str(e), 500)


@router.get("/active")
async def get_active_alerts(request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Admin: all currently active panic alerts."""
    try:
        flat_user_repo = FlatUserRepository(db)
        guard_repo = GuardRepository(db)
        panic_service = PanicAlertService(db)
        alerts = panic_service.get_active()
        return success("Active panic alerts", data=[a.to_dict() for a in alerts])
    except Exception as e:
        return error("Failed to fetch", "SERVER_ERROR", str(e), 500)


@router.patch("/{alert_id}/resolve")
async def resolve_alert(alert_id: int, request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Admin: resolve a panic alert after the situation is handled."""
    try:
        flat_user_repo = FlatUserRepository(db)
        guard_repo = GuardRepository(db)
        panic_service = PanicAlertService(db)
        user_id = current_user.id
        alert   = panic_service.resolve(alert_id, user_id)
        return success("Panic alert resolved", data=alert.to_dict())
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to resolve alert", "SERVER_ERROR", str(e), 500)
