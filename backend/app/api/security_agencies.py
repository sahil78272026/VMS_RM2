from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models import User, SecurityAgency
from app.schemas.security_agency import CreateSecurityAgencyRequest, UpdateSecurityAgencyRequest
from app.api.deps import active_account_required, require_society_admin

router = APIRouter(prefix="/api/v1/societies/{society_id}/security-agencies", tags=["Security Agencies"])

@router.get("")
def list_agencies(
    society_id: int,
    status: Optional[str] = Query(None),
    current_user: User = Depends(active_account_required),
    db: Session = Depends(get_db)
):
    query = db.query(SecurityAgency).filter(SecurityAgency.society_id == society_id)
    if status:
        query = query.filter(SecurityAgency.status == status)
    
    agencies = query.all()
    return {
        "success": True,
        "message": "Security agencies retrieved",
        "data": [a.to_dict() for a in agencies],
        "error": None
    }

@router.post("")
def create_agency(
    society_id: int,
    data: CreateSecurityAgencyRequest,
    current_user: User = Depends(require_society_admin),
    db: Session = Depends(get_db)
):
    agency = SecurityAgency(
        society_id=society_id,
        name=data.name,
        contact_person=data.contact_person,
        contact_number=data.contact_number,
        email=data.email,
        contract_start=data.contract_start,
        contract_end=data.contract_end,
        status=data.status
    )
    db.add(agency)
    db.commit()
    db.refresh(agency)
    
    return {
        "success": True,
        "message": "Security agency created successfully",
        "data": agency.to_dict(),
        "error": None
    }

@router.put("/{agency_id}")
def update_agency(
    society_id: int,
    agency_id: int,
    data: UpdateSecurityAgencyRequest,
    current_user: User = Depends(require_society_admin),
    db: Session = Depends(get_db)
):
    agency = db.query(SecurityAgency).filter(
        SecurityAgency.society_id == society_id,
        SecurityAgency.id == agency_id
    ).first()
    
    if not agency:
        raise HTTPException(status_code=404, detail="Security agency not found")
        
    for key, value in data.dict(exclude_unset=True).items():
        setattr(agency, key, value)
        
    db.commit()
    db.refresh(agency)
    
    return {
        "success": True,
        "message": "Security agency updated successfully",
        "data": agency.to_dict(),
        "error": None
    }
