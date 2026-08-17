from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models import User, ParkingViolation
from app.schemas.parking_violation import CreateParkingViolationRequest, UpdateParkingViolationRequest
from app.api.deps import active_account_required, require_society_admin

router = APIRouter(prefix="/api/v1/societies/{society_id}/parking-violations", tags=["Parking Violations"])

@router.get("")
def list_violations(
    society_id: int,
    status: Optional[str] = Query(None),
    current_user: User = Depends(active_account_required),
    db: Session = Depends(get_db)
):
    query = db.query(ParkingViolation).filter(ParkingViolation.society_id == society_id)
    if status:
        query = query.filter(ParkingViolation.status == status)
    
    violations = query.all()
    return {
        "success": True,
        "message": "Parking violations retrieved",
        "data": [v.to_dict() for v in violations],
        "error": None
    }

@router.post("")
def create_violation(
    society_id: int,
    data: CreateParkingViolationRequest,
    current_user: User = Depends(active_account_required),
    db: Session = Depends(get_db)
):
    guard_id = None
    if current_user.guard:
        guard_id = current_user.guard.id
    else:
        from app.models import Guard
        guard = db.query(Guard).filter(Guard.society_id == society_id).first()
        if guard:
            guard_id = guard.id
        else:
            raise HTTPException(status_code=400, detail="No guards found in this society to report violation")

    violation = ParkingViolation(
        society_id=society_id,
        reported_by=guard_id,
        vehicle_number=data.vehicle_number,
        violation_type=data.violation_type,
        photo_url=data.photo_url,
        notes=data.notes
    )
    db.add(violation)
    db.commit()
    db.refresh(violation)
    
    return {
        "success": True,
        "message": "Parking violation reported",
        "data": violation.to_dict(),
        "error": None
    }

@router.put("/{violation_id}")
def update_violation(
    society_id: int,
    violation_id: int,
    data: UpdateParkingViolationRequest,
    current_user: User = Depends(active_account_required),
    db: Session = Depends(get_db)
):
    violation = db.query(ParkingViolation).filter(
        ParkingViolation.society_id == society_id,
        ParkingViolation.id == violation_id
    ).first()
    
    if not violation:
        raise HTTPException(status_code=404, detail="Parking violation not found")
        
    for key, value in data.dict(exclude_unset=True).items():
        setattr(violation, key, value)
        
    db.commit()
    db.refresh(violation)
    
    return {
        "success": True,
        "message": "Parking violation updated successfully",
        "data": violation.to_dict(),
        "error": None
    }
