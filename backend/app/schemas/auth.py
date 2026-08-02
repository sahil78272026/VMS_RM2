from pydantic import BaseModel, Field, EmailStr
from typing import Optional

class RegisterResidentRequest(BaseModel):
    name: str
    phone: str
    password: str = Field(min_length=8)
    email: Optional[EmailStr] = None
    flat_id: int
    society_id: Optional[int] = None
    move_in_date: str

class LoginRequest(BaseModel):
    phone: str
    password: str
    society_id: Optional[int] = None
    expo_push_token: Optional[str] = None

class GoogleLoginRequest(BaseModel):
    email: Optional[str] = None
    name: Optional[str] = None
    google_id: Optional[str] = None
    photo_url: Optional[str] = None
    society_id: Optional[int] = None
    expo_push_token: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)
