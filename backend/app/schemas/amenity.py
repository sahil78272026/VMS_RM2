from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from enum import Enum

class AmenityStatus(str, Enum):
    active = "active"
    inactive = "inactive"

class AmenityBase(BaseModel):
    name: str
    category: str = "Service"
    description: Optional[str] = None
    contact_info: Optional[str] = None
    timing: Optional[str] = None
    status: AmenityStatus = AmenityStatus.active

class AmenityCreate(AmenityBase):
    pass

class AmenityUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    contact_info: Optional[str] = None
    timing: Optional[str] = None
    status: Optional[AmenityStatus] = None

class AmenityResponse(AmenityBase):
    id: int
    society_id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
