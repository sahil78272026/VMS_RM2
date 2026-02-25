from pydantic import BaseModel, validator
from typing import Optional

class VisitorEntryDTO(BaseModel):
    mobile: str
    flat_id: str
    purpose: str
    name: Optional[str]
    company: Optional[str]

class VisitorLookUpDTO(BaseModel):
    mobile:str
    pass
    @validator("mobile")
    def clean_mobile(cls, v:str):
        if not v:
            raise ValueError("mobile required")
        v = v.strip()
        if len(v)!=10:
            raise ValueError("Mobile Number must be of 10 digits")
    
        if not v.isdigit():
            raise ValueError("Mobile Number must contain digit only")
        
        return v

    