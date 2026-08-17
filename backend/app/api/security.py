from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import date
from app.database import get_db
from app.api.deps import active_account_required, require_society_admin
from app.models import User, SecurityAgency, ParkingViolation

router = APIRouter(prefix="/api/v1/security", tags=["Security & Compliance"])

class SecurityAgencyCreate(BaseModel):
    name: str
    contact_info: Optional[str] = None
    contract_start: Optional[date] = None
    contract_end: Optional[date] = None

class ParkingViolationCreate(BaseModel):
    vehicle_number: str
    violation_type: str = "wrong_parking"
    photo_url: Optional[str] = None
    notes: Optional[str] = None

# --- Security Agencies ---

@router.get("/agencies")
def list_agencies(
    society_id: int,
    current_user: User = Depends(active_account_required),
    db: Session = Depends(get_db)
):
    agencies = db.query(SecurityAgency).filter_by(society_id=society_id).all()
    return {
        "success": True,
        "message": "Agencies retrieved",
        "data": [a.to_dict() for a in agencies],
        "error": None
    }

@router.post("/agencies")
def create_agency(
    society_id: int,
    data: SecurityAgencyCreate,
    current_user: User = Depends(require_society_admin),
    db: Session = Depends(get_db)
):
    agency = SecurityAgency(
        society_id=society_id,
        name=data.name,
        contact_info=data.contact_info,
        contract_start=data.contract_start,
        contract_end=data.contract_end
    )
    db.add(agency)
    db.commit()
    db.refresh(agency)
    return {
        "success": True,
        "message": "Security agency created",
        "data": agency.to_dict(),
        "error": None
    }

# --- Parking Violations ---

@router.get("/violations")
def list_violations(
    society_id: int,
    status: Optional[str] = None,
    current_user: User = Depends(active_account_required),
    db: Session = Depends(get_db)
):
    q = db.query(ParkingViolation).filter_by(society_id=society_id)
    if status:
        q = q.filter_by(status=status)
    violations = q.order_by(ParkingViolation.created_at.desc()).all()
    return {
        "success": True,
        "message": "Violations retrieved",
        "data": [v.to_dict() for v in violations],
        "error": None
    }

@router.post("/violations")
def create_violation(
    society_id: int,
    data: ParkingViolationCreate,
    current_user: User = Depends(active_account_required),
    db: Session = Depends(get_db)
):
    # Guard or Admin can create
    guard_id = current_user.guard.id if current_user.guard else None
    violation = ParkingViolation(
        society_id=society_id,
        vehicle_number=data.vehicle_number,
        violation_type=data.violation_type,
        reported_by=guard_id,
        photo_url=data.photo_url,
        notes=data.notes
    )
    db.add(violation)
    db.commit()
    db.refresh(violation)
    return {
        "success": True,
        "message": "Parking violation logged",
        "data": violation.to_dict(),
        "error": None
    }

@router.put("/violations/{violation_id}/resolve")
def resolve_violation(
    violation_id: int,
    current_user: User = Depends(require_society_admin),
    db: Session = Depends(get_db)
):
    v = db.query(ParkingViolation).filter_by(id=violation_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Violation not found")
    v.status = "resolved"
    db.commit()
    db.refresh(v)
    return {
        "success": True,
        "message": "Violation marked as resolved",
        "data": v.to_dict(),
        "error": None
    }
