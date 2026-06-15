"""
Gates Routes — /api/v1/gates
Admin manages gates. All roles can view active gates.
"""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.deps import get_current_user

from app.services.gate_service import GateService
from app.utils.response import success, error
from app.utils.exceptions import AppException



router = APIRouter(prefix="/api/v1/gates", tags=["gates"])

@router.get("")
async def get_all_gates(request: Request, db: Session = Depends(get_db)):
    """All roles: list all active gates."""
    try:
        gate_service = GateService(db)
        gates = gate_service.get_all()
        return success("Gates fetched", data=[g.to_dict() for g in gates])
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to fetch gates", "SERVER_ERROR", str(e), 500)


@router.get("/{gate_id}")
async def get_gate(gate_id: int, request: Request, db: Session = Depends(get_db)):
    """Get a single gate by ID."""
    try:
        gate_service = GateService(db)
        gate = gate_service.get_by_id(gate_id)
        return success("Gate fetched", data=gate.to_dict())
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to fetch gate", "SERVER_ERROR", str(e), 500)


@router.post("")
async def create_gate(request: Request, db: Session = Depends(get_db)):
    """Admin: add a new gate."""
    try:
        gate_service = GateService(db)
        data = await request.json()
        gate = gate_service.create(data)
        return success("Gate created", data=gate.to_dict(), status_code=201)
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to create gate", "SERVER_ERROR", str(e), 500)


@router.patch("/{gate_id}")
async def update_gate(gate_id: int, request: Request, db: Session = Depends(get_db)):
    """Admin: update gate name, type or status."""
    try:
        gate_service = GateService(db)
        data = await request.json()
        gate = gate_service.update(gate_id, data)
        return success("Gate updated", data=gate.to_dict())
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to update gate", "SERVER_ERROR", str(e), 500)
