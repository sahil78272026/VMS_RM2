from pydantic import BaseModel
from typing import Optional

class CreateParkingViolationRequest(BaseModel):
    vehicle_number: str
    violation_type: str  # "unauthorized_parking", "overstay", "wrong_parking"
    photo_url: Optional[str] = None
    notes: Optional[str] = None

class UpdateParkingViolationRequest(BaseModel):
    status: Optional[str] = None  # "open", "resolved"
    notes: Optional[str] = None
