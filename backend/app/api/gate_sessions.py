"""
Gate Sessions Routes — /api/v1/gate-sessions
Guards start and end their shifts. Admin monitors all sessions.
"""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.deps import get_current_user

from app.services.gate_session_service import GateSessionService
from app.repositories import GuardRepository
from app.utils.response import success, error
from app.utils.exceptions import AppException



router = APIRouter(prefix="/api/v1/gate-sessions", tags=["gate-sessions"])

@router.post("/start")
async def start_shift(request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """
    Guard starts their shift at a specific gate.
    Creates a new gate session and determines shift (morning/night) automatically.
    """
    try:
        guard_repo = GuardRepository(db)
        session_service = GateSessionService(db)
        user_id  = current_user.id
        guard    = guard_repo.get_by_user(user_id)
        if not guard:
            return error("Guard profile not found", "NOT_FOUND", status_code=404)

        data     = await request.json()
        session  = session_service.start_shift(guard.id, data.get("gate_id"))
        return success("Shift started successfully", data=session.to_dict(), status_code=201)
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to start shift", "SERVER_ERROR", str(e), 500)


@router.post("/end")
async def end_shift(request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Guard ends their current shift. Closes the active gate session."""
    try:
        guard_repo = GuardRepository(db)
        session_service = GateSessionService(db)
        user_id = current_user.id
        guard   = guard_repo.get_by_user(user_id)
        if not guard:
            return error("Guard profile not found", "NOT_FOUND", status_code=404)

        session = session_service.end_shift(guard.id)
        return success("Shift ended successfully", data=session.to_dict())
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to end shift", "SERVER_ERROR", str(e), 500)


@router.get("")
async def get_all_sessions(request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Admin: list all gate sessions with filters."""
    try:
        guard_repo = GuardRepository(db)
        session_service = GateSessionService(db)
        guard_id = request.query_params.get("guard_id")
        gate_id  = request.query_params.get("gate_id")
        page     = int(request.query_params.get("page", 1))
        per_page = int(request.query_params.get("per_page", 20))
        result   = session_service.get_all(
            guard_id=guard_id,
            gate_id=gate_id,
            page=page,
            per_page=per_page
        )
        return success(
            "Gate sessions fetched",
            data=[s.to_dict() for s in result["items"]],
            meta=result["meta"]
        )
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to fetch sessions", "SERVER_ERROR", str(e), 500)


@router.get("/active")
async def get_active_sessions(request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Admin: all currently active guard sessions."""
    try:
        guard_repo = GuardRepository(db)
        session_service = GateSessionService(db)
        sessions = session_service.get_active()
        return success("Active sessions fetched", data=[s.to_dict() for s in sessions])
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to fetch active sessions", "SERVER_ERROR", str(e), 500)


@router.get("/my")
async def get_my_sessions(request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Guard: own shift history."""
    try:
        guard_repo = GuardRepository(db)
        session_service = GateSessionService(db)
        user_id  = current_user.id
        guard    = guard_repo.get_by_user(user_id)
        if not guard:
            return error("Guard profile not found", "NOT_FOUND", status_code=404)

        sessions = session_service.get_by_guard(guard.id)
        return success("Your shift history", data=[s.to_dict() for s in sessions])
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to fetch sessions", "SERVER_ERROR", str(e), 500)


@router.get("/{session_id}")
async def get_session(session_id: int, request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Admin: get session details with entry/exit stats."""
    try:
        guard_repo = GuardRepository(db)
        session_service = GateSessionService(db)
        result = session_service.get_with_stats(session_id)
        return success("Session details fetched", data=result)
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to fetch session", "SERVER_ERROR", str(e), 500)
