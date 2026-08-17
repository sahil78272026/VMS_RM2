from pydantic import BaseModel
from typing import Optional
from datetime import date

class CreateSecurityAgencyRequest(BaseModel):
    name: str
    contact_person: Optional[str] = None
    contact_number: Optional[str] = None
    email: Optional[str] = None
    contract_start: Optional[date] = None
    contract_end: Optional[date] = None
    status: Optional[str] = "active"

class UpdateSecurityAgencyRequest(BaseModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    contact_number: Optional[str] = None
    email: Optional[str] = None
    contract_start: Optional[date] = None
    contract_end: Optional[date] = None
    status: Optional[str] = None
