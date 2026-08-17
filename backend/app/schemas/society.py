from pydantic import BaseModel, Field
from typing import Optional, List


class CreateSocietyRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    slug: str = Field(..., min_length=2, max_length=100)
    address: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    total_flats: Optional[int] = None
    logo_url: Optional[str] = None
    upi_id: Optional[str] = None
    status: Optional[str] = "active"


class UpdateSocietyRequest(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    total_flats: Optional[int] = None
    logo_url: Optional[str] = None
    upi_id: Optional[str] = None
    status: Optional[str] = None


class BatchCreateFlatsRequest(BaseModel):
    prefix: Optional[str] = ""  # e.g. "A-"
    start_number: int = 1
    count: int = 10
    block_names: Optional[List[str]] = None  # e.g. ["A", "B", "C"]
    floors: Optional[int] = None
    flats_per_floor: Optional[int] = None
    flat_numbers: Optional[List[str]] = None


class AssignAdminRequest(BaseModel):
    user_id: Optional[int] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    admin_role: Optional[str] = "regular"
    flat_id: Optional[int] = None
