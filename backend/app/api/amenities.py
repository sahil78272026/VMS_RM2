from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.api.deps import require_roles, get_current_user
from app.models import User, Amenity, SocietyAdmin
from app.schemas.amenity import AmenityCreate, AmenityResponse, AmenityUpdate
from app.utils.response import success
from app.utils.exceptions import ForbiddenError, NotFoundError

router = APIRouter(prefix="/api/v1/amenities", tags=["Amenities"])

@router.post("/", response_model=dict)
def create_amenity(
    data: AmenityCreate,
    society_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin", "society_admin"))
):
    if user.role != "super_admin":
        is_admin = db.query(SocietyAdmin).filter_by(user_id=user.id, society_id=society_id).first()
        if not is_admin:
            raise ForbiddenError("Not authorized for this society")
            
    amenity = Amenity(**data.model_dump(), society_id=society_id)
    db.add(amenity)
    db.commit()
    db.refresh(amenity)
    return success(message="Amenity created successfully", data=amenity.to_dict())

@router.get("/", response_model=dict)
def get_amenities(
    society_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    amenities = db.query(Amenity).filter(Amenity.society_id == society_id).all()
    return success(message="Amenities fetched successfully", data=[a.to_dict() for a in amenities])
