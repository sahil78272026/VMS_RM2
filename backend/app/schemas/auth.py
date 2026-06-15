from pydantic import BaseModel, Field, EmailStr
from typing import Optional

class RegisterResidentRequest(BaseModel):
    name: str
    phone: str
    password: str = Field(min_length=8)
    email: Optional[EmailStr] = None
    flat_id: int
    move_in_date: str

class LoginRequest(BaseModel):
    phone: str
    password: str
    expo_push_token: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)
