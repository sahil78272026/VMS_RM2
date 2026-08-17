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
        data = await request.json()
        
        target_guard_id = data.get("target_guard_id")
        pin = data.get("pin")
        
        if target_guard_id and pin:
            import bcrypt
            target_guard = guard_repo.get_by_id(target_guard_id)
            if not target_guard:
                return error("Target guard profile not found", "NOT_FOUND", status_code=404)
            if not target_guard.shift_pin_hash or not bcrypt.checkpw(str(pin).encode('utf-8'), str(target_guard.shift_pin_hash).encode('utf-8')):
                return error("Invalid PIN for guard", "UNAUTHORIZED", status_code=401)
            active_guard = target_guard
        else:
            user_id = current_user.id
            active_guard = guard_repo.get_by_user(user_id)
            if not active_guard:
                return error("Guard profile not found", "NOT_FOUND", status_code=404)

        session = session_service.start_shift(active_guard.id, data.get("gate_id"), data.get("guard_name"))
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
        # Check if a specific guard is targeted via JSON payload
        data = {}
        try:
            data = await request.json()
        except:
            pass
            
        target_guard_id = data.get("target_guard_id")
        if target_guard_id:
            guard = guard_repo.get_by_id(target_guard_id)
        else:
            user_id = current_user.id
            guard = guard_repo.get_by_user(user_id)
            
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
        society_id = request.headers.get("X-Society-ID")
        sessions = session_service.get_active(society_id=society_id)
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
