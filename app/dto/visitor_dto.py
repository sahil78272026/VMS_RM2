from pydantic import BaseModel
from typing import Optional

class VisitorEntryDTO(BaseModel):
    mobile: str
    flat_id: str
    purpose: str
    name: Optional[str]
    company: Optional[str]