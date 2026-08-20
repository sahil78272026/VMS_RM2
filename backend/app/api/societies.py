from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.services.society_service import SocietyService
from app.schemas.society import (
    CreateSocietyRequest, UpdateSocietyRequest,
    BatchCreateFlatsRequest, AssignAdminRequest
)
from app.api.deps import (
    get_current_user, active_account_required,
    require_super_admin, require_society_admin
)
from app.models import User, SocietyDonation
from pydantic import BaseModel

class DonationRequest(BaseModel):
    amount: float
    utr_number: str
    purpose: str = "Society Welfare Fund"
    receipt_url: Optional[str] = None

router = APIRouter(prefix="/api/v1/societies", tags=["Societies"])


@router.get("")
def list_societies(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    service = SocietyService(db)
    societies = service.get_all(status=status)
    data = []
    for s in societies:
        s_dict = s.to_dict()
        admins = service.get_society_admins(s.id)
        s_dict["admins"] = [{"id": a.user.id, "name": a.user.name, "phone": a.user.phone} for a in admins if a.user]
        data.append(s_dict)

    return {
        "success": True,
        "message": "Societies retrieved",
        "data": data,
        "error": None
    }


@router.post("")
def create_society(
    data: CreateSocietyRequest,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    service = SocietyService(db)
    society = service.create(data.dict())
    return {
        "success": True,
        "message": f"Society '{society.name}' created successfully",
        "data": society.to_dict(),
        "error": None
    }


@router.get("/catalog")
def get_society_catalog(
    city: Optional[str] = Query(None),
    q: Optional[str] = Query(None)
):
    import json
    import os
    catalog_path = os.path.join(os.path.dirname(__file__), "..", "data", "up_societies_catalog.json")
    try:
        with open(catalog_path, "r", encoding="utf-8") as f:
            items = json.load(f)
    except Exception as e:
        items = []

    if city and city.lower() != "all":
        items = [i for i in items if i.get("city", "").lower() == city.lower()]

    if q:
        q_lower = q.lower()
        items = [
            i for i in items
            if q_lower in i.get("name", "").lower()
            or q_lower in i.get("address", "").lower()
            or q_lower in i.get("zone", "").lower()
        ]

    return {
        "success": True,
        "message": "UP Society catalog retrieved",
        "data": items,
        "error": None
    }


@router.get("/{society_id}")
def get_society(
    society_id: int,
    db: Session = Depends(get_db)
):
    service = SocietyService(db)
    society = service.get_by_id(society_id)
    return {
        "success": True,
        "message": "Society details retrieved",
        "data": society.to_dict(),
        "error": None
    }


@router.put("/{society_id}")
def update_society(
    society_id: int,
    data: UpdateSocietyRequest,
    current_user: User = Depends(active_account_required),
    db: Session = Depends(get_db)
):
    # Super admin or society admin can update
    service = SocietyService(db)
    if not (current_user.is_super_admin or current_user.role == "super_admin"):
        from app.repositories import SocietyAdminRepository
        if not SocietyAdminRepository(db).is_admin(society_id, current_user.id):
            from fastapi import HTTPException
            raise HTTPException(status_code=403, detail="Admin privileges required for this society")

    updated = service.update(society_id, data.dict(exclude_unset=True))
    return {
        "success": True,
        "message": "Society updated successfully",
        "data": updated.to_dict(),
        "error": None
    }


@router.get("/{society_id}/stats")
def get_society_stats(
    society_id: int,
    current_user: User = Depends(active_account_required),
    db: Session = Depends(get_db)
):
    service = SocietyService(db)
    stats = service.get_stats(society_id)
    return {
        "success": True,
        "message": "Society stats retrieved",
        "data": stats,
        "error": None
    }


@router.post("/{society_id}/batch-flats")
def batch_create_flats(
    society_id: int,
    data: BatchCreateFlatsRequest,
    current_user: User = Depends(active_account_required),
    db: Session = Depends(get_db)
):
    service = SocietyService(db)
    if not (current_user.is_super_admin or current_user.role == "super_admin"):
        from app.repositories import SocietyAdminRepository
        if not SocietyAdminRepository(db).is_admin(society_id, current_user.id):
            from fastapi import HTTPException
            raise HTTPException(status_code=403, detail="Admin privileges required for this society")

    flats = service.batch_create_flats(society_id, data.dict())
    return {
        "success": True,
        "message": f"Successfully created {len(flats)} flats",
        "data": flats,
        "error": None
    }


@router.get("/{society_id}/admins")
def list_society_admins(
    society_id: int,
    current_user: User = Depends(active_account_required),
    db: Session = Depends(get_db)
):
    service = SocietyService(db)
    admins = service.get_society_admins(society_id)
    return {
        "success": True,
        "message": "Society admins retrieved",
        "data": [a.to_dict() for a in admins],
        "error": None
    }


@router.post("/{society_id}/admins")
def assign_society_admin(
    society_id: int,
    data: AssignAdminRequest,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    service = SocietyService(db)
    assignment = service.assign_admin(society_id, user_id=data.user_id, data=data.dict())
    return {
        "success": True,
        "message": f"Admin assigned to society {society_id} successfully",
        "data": assignment.to_dict(),
        "error": None
    }


@router.delete("/{society_id}/admins/{user_id}")
def remove_society_admin(
    society_id: int,
    user_id: int,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    service = SocietyService(db)
    service.remove_admin(society_id, user_id)
    return {
        "success": True,
        "message": f"User {user_id} removed from society {society_id} admins",
        "data": None,
        "error": None
    }


@router.post("/donate")
async def submit_donation(
    request: Request,
    payload: DonationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    society_id = request.headers.get("X-Society-ID")
    if not society_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="X-Society-ID header missing")
    
    donation = SocietyDonation(
        society_id=int(society_id),
        user_id=current_user.id,
        amount=payload.amount,
        purpose=payload.purpose,
        utr_number=payload.utr_number,
        receipt_url=payload.receipt_url,
        status="pending"
    )
    db.add(donation)
    db.commit()
    db.refresh(donation)
    
    return {
        "success": True,
        "message": "Donation recorded successfully",
        "data": donation.to_dict(),
        "error": None
    }

@router.get("/{society_id}/donations")
def get_donations(
    society_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_society_admin)
):
    donations = db.query(SocietyDonation).filter(SocietyDonation.society_id == society_id).order_by(SocietyDonation.created_at.desc()).all()
    res = []
    for d in donations:
        dd = d.to_dict()
        dd["user_name"] = d.user.name if d.user else "Unknown"
        res.append(dd)
    return {
        "success": True,
        "data": res
    }

@router.patch("/{society_id}/donations/{donation_id}/verify")
def verify_donation(
    society_id: int,
    donation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_society_admin)
):
    donation = db.query(SocietyDonation).filter(SocietyDonation.id == donation_id, SocietyDonation.society_id == society_id).first()
    if not donation:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Donation not found")
    
    donation.status = "verified"
    db.commit()
    return {
        "success": True,
        "message": "Donation verified successfully",
        "data": donation.to_dict()
    }

@router.patch("/{society_id}/donations/{donation_id}/reject")
def reject_donation(
    society_id: int,
    donation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_society_admin)
):
    donation = db.query(SocietyDonation).filter(SocietyDonation.id == donation_id, SocietyDonation.society_id == society_id).first()
    if not donation:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Donation not found")
    
    donation.status = "rejected"
    db.commit()
    return {
        "success": True,
        "message": "Donation rejected",
        "data": donation.to_dict()
    }

# ── Super Admin Society Lifecycle Endpoints ─────────────────────────────────

@router.post("/{society_id}/suspend")
def suspend_society(
    society_id: int,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    service = SocietyService(db)
    society = service.suspend(society_id)
    return {
        "success": True,
        "message": f"Society '{society.name}' suspended. All users are locked out.",
        "data": society.to_dict(),
        "error": None
    }

@router.post("/{society_id}/activate")
def activate_society(
    society_id: int,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    service = SocietyService(db)
    society = service.activate(society_id)
    return {
        "success": True,
        "message": f"Society '{society.name}' activated successfully.",
        "data": society.to_dict(),
        "error": None
    }

@router.delete("/{society_id}")
def delete_society(
    society_id: int,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    service = SocietyService(db)
    # Ensure it's suspended first (safety check)
    society = service.get_by_id(society_id)
    if society.status != "suspended":
        from fastapi import HTTPException
        raise HTTPException(
            status_code=400,
            detail="Society must be suspended before it can be permanently deleted."
        )
        
        
    service.delete(society_id)
    return {
        "success": True,
        "message": f"Society '{society.name}' and all its data was permanently deleted.",
        "data": None,
        "error": None
    }


@router.post("/{society_id}/import-csv")
async def import_society_csv(
    society_id: int,
    file: __import__('fastapi').UploadFile = __import__('fastapi').File(...),
    current_user: User = Depends(active_account_required),
    db: Session = Depends(get_db)
):
    """
    Import MyGate ERP CSV format to bootstrap society flats and users.
    """
    service = SocietyService(db)
    if not (current_user.is_super_admin or current_user.role == "super_admin"):
        from app.repositories import SocietyAdminRepository
        if not SocietyAdminRepository(db).is_admin(society_id, current_user.id):
            from fastapi import HTTPException
            raise HTTPException(status_code=403, detail="Admin privileges required for this society")
            
    content = await file.read()
    import csv, io
    csv_reader = csv.DictReader(io.StringIO(content.decode("utf-8")))
    
    # Process rows (assuming MyGate CSV structure: Flat Number, Resident Name, Resident Phone, Type (Owner/Tenant))
    records = []
    for row in csv_reader:
        records.append({
            "flat_number": row.get("Flat Number", "").strip(),
            "resident_name": row.get("Resident Name", "").strip(),
            "resident_phone": row.get("Resident Phone", "").strip(),
            "type": row.get("Type", "owner").strip().lower()
        })
        
    result = service.import_from_csv(society_id, records)
    
    return {
        "success": True,
        "message": f"Successfully imported {result['flats_created']} flats and {result['users_created']} users.",
        "data": result,
        "error": None
    }
